-- Chaîne de notifications push — export du projet distant.
--
-- Déployée le 20 août 2026, elle n'avait jamais été versionnée : triggers,
-- `ff_enqueue_notif` et l'edge function `send-push` n'existaient que sur
-- Supabase. Ce fichier est un relevé fidèle de l'état distant au 24 septembre
-- 2026, obtenu par `pg_get_functiondef`. Il n'introduit aucun changement : le
-- rejouer sur une base neuve doit reproduire ce qui tourne aujourd'hui.
--
-- Le déroulé, de bout en bout :
--
--   table modifiée → trigger → ff_enqueue_notif(destinataires, canal, …)
--     → insertion dans `notifications`, une ligne par destinataire
--     → net.http_post vers /send-push, en-tête X-Push-Secret
--     → send-push lit `device_token`, calcule le badge, poste à l'API Expo
--
-- ⚠️ `app_secrets` porte `push_dispatch_secret` et `supabase_functions_url`.
-- La table a une RLS en `USING (false)` : seul le `service_role` la lit. Les
-- secrets ne sont pas dans ce fichier et n'ont pas à y être.

-- ---------------------------------------------------------------------------
-- Destinataires
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.membres_actifs_groupe(p_groupe_id uuid)
 RETURNS uuid[]
 LANGUAGE sql
 STABLE
AS $function$
  SELECT COALESCE(array_agg(user_id), '{}') FROM groupe_membres
  WHERE groupe_id = p_groupe_id AND statut = 'actif';
$function$;

CREATE OR REPLACE FUNCTION public.membres_du_pupitre(p_pupitre_id uuid)
 RETURNS uuid[]
 LANGUAGE sql
 STABLE
AS $function$
  SELECT COALESCE(array_agg(user_id), '{}') FROM groupe_membres
  WHERE role_id = p_pupitre_id AND statut = 'actif';
$function$;

-- ---------------------------------------------------------------------------
-- Point d'entrée unique : écrit la notification en base, puis réveille l'edge
-- function. Sans secret ni URL, elle s'arrête après l'écriture — la
-- notification reste consultable dans l'app, seul le push est perdu.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ff_enqueue_notif(p_destinataire_ids uuid[], p_canal text, p_titre text, p_body text, p_lien_url text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_dest uuid;
  v_secret text;
  v_url text;
  v_body jsonb;
BEGIN
  IF p_destinataire_ids IS NULL OR cardinality(p_destinataire_ids) = 0 THEN
    RETURN;
  END IF;

  FOREACH v_dest IN ARRAY p_destinataire_ids LOOP
    INSERT INTO notifications (user_id, type, titre, contenu, lien_type, lien_id, lien_url)
    VALUES (v_dest, p_canal, p_titre, p_body, p_canal, NULL, p_lien_url);
  END LOOP;

  SELECT valeur INTO v_secret FROM public.app_secrets WHERE cle = 'push_dispatch_secret';
  SELECT valeur INTO v_url FROM public.app_secrets WHERE cle = 'supabase_functions_url';
  IF v_secret IS NULL OR v_url IS NULL THEN
    RETURN;
  END IF;

  v_body := jsonb_build_object(
    'user_ids', p_destinataire_ids,
    'canal', p_canal,
    'titre', p_titre,
    'body', p_body,
    'data', jsonb_build_object('url', p_lien_url)
  );

  PERFORM net.http_post(
    url := v_url || '/send-push',
    body := v_body,
    headers := jsonb_build_object('Content-Type', 'application/json', 'X-Push-Secret', v_secret)
  );
END;
$function$;

-- 🔒 Correctif du 21 août 2026 : `ff_enqueue_notif` était exécutable par `anon`,
-- droit hérité de PUBLIC. Quiconque détenait la clé anon — publique, embarquée
-- dans l'APK — pouvait pousser une notification arbitraire à n'importe qui via
-- /rest/v1/rpc/ff_enqueue_notif.
--
-- ⚠️ `REVOKE … FROM anon, authenticated` ne suffit pas : le droit vient de
-- PUBLIC. Toujours révoquer FROM PUBLIC, puis revérifier avec
-- has_function_privilege() — le `success: true` d'une migration ne prouve rien.
--
-- Les triggers ne sont pas touchés : SECURITY DEFINER, propriété de postgres,
-- qui conserve EXECUTE.
REVOKE ALL ON FUNCTION public.ff_enqueue_notif(uuid[], text, text, text, text)
  FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Fonctions de trigger
--
-- Toutes en SECURITY DEFINER : elles lisent `groupe_membres` et écrivent dans
-- `notifications` pour le compte d'autrui, ce que la RLS refuserait à
-- l'utilisateur qui déclenche l'action.
-- L'émetteur est systématiquement retiré du lot : on ne se notifie pas soi-même.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_message_envoye()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_dest uuid[]; v_parent_auteur uuid; v_apercu text;
BEGIN
  v_apercu := left(COALESCE(NULLIF(NEW.contenu, ''), '[Pièce jointe]'), 80);

  IF NEW.pupitre_id IS NOT NULL THEN
    v_dest := public.membres_du_pupitre(NEW.pupitre_id);
  ELSE
    v_dest := public.membres_actifs_groupe(NEW.groupe_id);
  END IF;
  v_dest := array_remove(v_dest, NEW.user_id);

  PERFORM public.ff_enqueue_notif(
    v_dest,
    'message_envoye',
    'Nouveau message',
    v_apercu,
    '/groupes/' || NEW.groupe_id || '/chat'
  );

  IF NEW.parent_message_id IS NOT NULL THEN
    SELECT user_id INTO v_parent_auteur FROM messages WHERE id = NEW.parent_message_id;
    IF v_parent_auteur IS NOT NULL AND v_parent_auteur <> NEW.user_id THEN
      PERFORM public.ff_enqueue_notif(
        ARRAY[v_parent_auteur],
        'message_reponse',
        'Réponse à ton message',
        v_apercu,
        '/groupes/' || NEW.groupe_id || '/chat'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_seance_creee()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.groupe_id IS NULL THEN RETURN NEW; END IF;
  PERFORM public.ff_enqueue_notif(
    public.membres_actifs_groupe(NEW.groupe_id),
    'seance_creee',
    'Nouvelle répétition',
    COALESCE(NEW.titre, 'Une répétition') || ' est planifiée le ' || to_char(NEW.date_seance, 'DD/MM'),
    '/groupes/' || NEW.groupe_id || '/seances/' || NEW.id
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_projet_cree()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.groupe_id IS NULL THEN RETURN NEW; END IF;
  PERFORM public.ff_enqueue_notif(
    public.membres_actifs_groupe(NEW.groupe_id),
    'projet_cree',
    'Nouveau projet',
    'Le projet « ' || NEW.nom || ' » a été créé.',
    '/projets/' || NEW.id
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_projet_termine()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (NEW.statut = 'termine' AND OLD.statut IS DISTINCT FROM 'termine') THEN RETURN NEW; END IF;

  IF NEW.groupe_id IS NOT NULL THEN
    PERFORM public.ff_enqueue_notif(
      public.membres_actifs_groupe(NEW.groupe_id),
      'projet_termine',
      'Projet terminé',
      'Bravo ! Le projet « ' || NEW.nom || ' » est terminé.',
      '/projets/' || NEW.id
    );
  ELSIF NEW.user_id IS NOT NULL THEN
    PERFORM public.ff_enqueue_notif(
      ARRAY[NEW.user_id],
      'projet_perso_termine',
      'Félicitations !',
      'Ton projet « ' || NEW.nom || ' » est terminé. Quel exploit !',
      '/projets/' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_setlist_ajoute()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_groupe uuid; v_titre text; v_morceau text;
BEGIN
  SELECT groupe_id, COALESCE(titre, 'Répétition') INTO v_groupe, v_titre
  FROM seances WHERE id = NEW.seance_id;
  IF v_groupe IS NULL THEN RETURN NEW; END IF;
  SELECT COALESCE(NEW.titre, r.titre_morceau, 'Un morceau') INTO v_morceau
  FROM (SELECT 1) x LEFT JOIN repertoire r ON r.id = NEW.repertoire_id;
  PERFORM public.ff_enqueue_notif(
    public.membres_actifs_groupe(v_groupe),
    'setlist_ajoute',
    'Nouveau morceau au programme',
    '« ' || v_morceau || ' » a été ajouté au programme de « ' || v_titre || ' ».',
    '/groupes/' || v_groupe || '/seances/' || NEW.seance_id
  );
  RETURN NEW;
END;
$function$;

-- Le partage d'une ressource vise trois portées : le groupe entier, un pupitre,
-- ou un membre nommé. La portée décide des destinataires et du lien.
CREATE OR REPLACE FUNCTION public.trg_ressource_ajoutee()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_dest uuid[]; v_groupe uuid;
BEGIN
  IF NEW.partage_type = 'groupe' THEN
    v_dest := public.membres_actifs_groupe(NEW.partage_groupe_id);
    v_groupe := NEW.partage_groupe_id;
  ELSIF NEW.partage_type = 'role' THEN
    v_groupe := public.groupe_du_pupitre(NEW.partage_role_id);
    v_dest := public.membres_du_pupitre(NEW.partage_role_id);
  ELSIF NEW.partage_type = 'membre' THEN
    v_groupe := public.groupe_du_membre(NEW.partage_membre_id);
    SELECT user_id INTO v_dest FROM groupe_membres WHERE id = NEW.partage_membre_id;
  ELSE
    RETURN NEW;
  END IF;

  PERFORM public.ff_enqueue_notif(
    v_dest,
    'fichier_partage',
    'Nouveau fichier partagé',
    '« ' || NEW.nom || ' » a été partagé.',
    CASE WHEN v_groupe IS NOT NULL THEN '/groupes/' || v_groupe ELSE NULL END
  );
  RETURN NEW;
END;
$function$;

-- Seul trigger qui sorte du cadre d'un groupe : une ressource d'équipe
-- SoundBoss s'adresse à tous, ou aux seuls utilisateurs dont les instruments
-- ou les genres croisent ses étiquettes.
CREATE OR REPLACE FUNCTION public.trg_ressource_equipe_publiee()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_dest uuid[];
BEGIN
  IF cardinality(NEW.tags) > 0 THEN
    -- Utilisateurs dont les instruments/genres croisent les étiquettes
    SELECT COALESCE(array_agg(u.id), '{}') INTO v_dest
    FROM users u
    WHERE u.is_active IS NOT FALSE
      AND (
        u.instruments && NEW.tags
        OR u.genres_musicaux && NEW.tags
      );
  ELSE
    -- Ressource générique : tous les utilisateurs actifs
    SELECT COALESCE(array_agg(id), '{}') INTO v_dest FROM users WHERE is_active IS NOT FALSE;
  END IF;

  PERFORM public.ff_enqueue_notif(
    v_dest,
    'ressource_publiee',
    'Nouvelle ressource SoundBoss',
    '« ' || NEW.titre || ' » est disponible dans ta bibliothèque.',
    '/(tabs)/projets'
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_groupe_membre_ajoute()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_nom text;
BEGIN
  IF NEW.statut <> 'actif' THEN RETURN NEW; END IF;
  SELECT nom INTO v_nom FROM groupes WHERE id = NEW.groupe_id;
  PERFORM public.ff_enqueue_notif(
    ARRAY[NEW.user_id],
    'groupe_ajout',
    'Bienvenue dans ' || COALESCE(v_nom, 'le groupe'),
    'Tu as rejoint le groupe. Bonne musique !',
    '/groupes/' || NEW.groupe_id
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_groupe_admin_nomme()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_nom text;
BEGIN
  IF NOT (NEW.est_admin = true AND COALESCE(OLD.est_admin, false) = false) THEN RETURN NEW; END IF;
  SELECT nom INTO v_nom FROM groupes WHERE id = NEW.groupe_id;
  PERFORM public.ff_enqueue_notif(
    ARRAY[NEW.user_id],
    'admin_nomme',
    'Nommé administrateur',
    'Tu es désormais administrateur de ' || COALESCE(v_nom, 'ton groupe') || '.',
    '/groupes/' || NEW.groupe_id
  );
  RETURN NEW;
END;
$function$;

-- Aides de portée, utilisées par trg_ressource_ajoutee. Placées après lui sans
-- dommage : un corps plpgsql n'est pas résolu à la création.
CREATE OR REPLACE FUNCTION public.groupe_du_pupitre(p_pupitre_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT groupe_id FROM roles_pupitres WHERE id = p_pupitre_id;
$function$;

CREATE OR REPLACE FUNCTION public.groupe_du_membre(p_membre_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  SELECT groupe_id FROM groupe_membres WHERE id = p_membre_id;
$function$;

-- Les destinataires suivent les pupitres visés par l'audio. Aucun pupitre =
-- tout le groupe ; sinon l'union des membres des pupitres cités.
CREATE OR REPLACE FUNCTION public.trg_enregistrement_ajoute()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_groupe uuid;
  v_titre text;
  v_dest uuid[];
BEGIN
  SELECT groupe_id, COALESCE(titre, 'Répétition') INTO v_groupe, v_titre
  FROM seances WHERE id = NEW.seance_id;
  IF v_groupe IS NULL THEN RETURN NEW; END IF;

  IF cardinality(NEW.pupitre_ids) = 0 THEN
    v_dest := membres_actifs_groupe(v_groupe);
  ELSE
    SELECT COALESCE(array_agg(DISTINCT m), '{}'::uuid[]) INTO v_dest
    FROM unnest(NEW.pupitre_ids) AS p,
         LATERAL unnest(membres_du_pupitre(p)) AS m;
  END IF;

  IF cardinality(COALESCE(v_dest, '{}'::uuid[])) = 0 THEN RETURN NEW; END IF;

  PERFORM public.ff_enqueue_notif(
    v_dest,
    'enregistrement_ajoute',
    'Nouvel audio',
    'Un audio a été ajouté à « ' || v_titre || ' ».',
    '/groupes/' || v_groupe || '/seances/' || NEW.seance_id
  );
  RETURN NEW;
END;
$function$;

-- La séparation de pistes n'avertit que son demandeur : elle a été payée par
-- lui, les autres membres n'ont rien commandé.
CREATE OR REPLACE FUNCTION public.trg_stems_termines()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_titre text;
begin
  if new.stems_statut is not distinct from old.stems_statut then
    return new;
  end if;
  if new.stems_demandeur is null then
    return new;
  end if;

  v_titre := coalesce(new.titre, 'Audio');

  if new.stems_statut = 'pret' then
    perform ff_enqueue_notif(
      array[new.stems_demandeur],
      'stems',
      'Pistes prêtes',
      format('Les pistes de « %s » sont disponibles dans le labo.', v_titre),
      null);
  elsif new.stems_statut = 'echec' then
    perform ff_enqueue_notif(
      array[new.stems_demandeur],
      'stems',
      'Extraction échouée',
      format('L''extraction des pistes de « %s » n''a pas abouti.', v_titre),
      null);
  end if;

  return new;
end;
$function$;

-- ---------------------------------------------------------------------------
-- Hors chaîne push, mais tout aussi absent du dépôt : le dépôt d'un audio
-- réveille le media-worker pour l'analyse (pics, BPM, tonalité).
--
-- Inerte tant que les secrets manquent, et c'est délibéré : déposer un audio
-- ne doit jamais échouer faute d'infrastructure d'analyse.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_audio_depose()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_secret text;
  v_url text;
BEGIN
  SELECT valeur INTO v_secret FROM app_secrets WHERE cle = 'media_worker_secret';
  SELECT valeur INTO v_url FROM app_secrets WHERE cle = 'media_worker_url';

  -- Tant que le container n'existe pas, le trigger est inerte : un dépôt
  -- d'audio ne doit jamais échouer faute d'infrastructure d'analyse.
  IF v_secret IS NULL OR v_url IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := rtrim(v_url, '/') || '/jobs/analyze',
    body := jsonb_build_object('media_id', NEW.id),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret)
  );

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_generation_terminee()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_titre text;
begin
  if new.statut is not distinct from old.statut then
    return new;
  end if;
  if new.user_id is null then
    return new;
  end if;
  if new.type not in ('generation_musique', 'generation_instrumental') then
    return new;
  end if;

  v_titre := coalesce(new.input_params->>'title', new.input_params->>'prompt', 'Ta génération');

  if new.statut = 'completed' then
    perform ff_enqueue_notif(
      array[new.user_id],
      'generation',
      'Génération prête',
      format('« %s » est prête à écouter.', left(v_titre, 60)),
      null);
  elsif new.statut = 'failed' then
    perform ff_enqueue_notif(
      array[new.user_id],
      'generation',
      'Génération échouée',
      format('« %s » n''a pas abouti.', left(v_titre, 60)),
      null);
  end if;

  return new;
end;
$function$;

-- ⚠️ Relevé en exportant, à trancher — cette fonction n'a pas été modifiée ici.
--
-- Elle écrit dans `notifications` SANS passer par ff_enqueue_notif : la
-- notification apparaît dans l'app, mais aucun push n'est envoyé. Et sur
-- ai_jobs elle coexiste avec trg_generation_terminee : une génération qui
-- aboutit produit donc DEUX lignes de notification, l'une poussée et l'autre
-- non. Elle annonce par ailleurs un remboursement de crédits qui n'existe pas
-- encore.
--
-- Trois issues possibles : la supprimer (les stems et la génération ont leurs
-- propres triggers), la restreindre aux types que trg_generation_terminee
-- ignore, ou la faire passer par ff_enqueue_notif. Décision reportée à la
-- facturation, qui donnera son sens à la phrase sur les crédits.
CREATE OR REPLACE FUNCTION public.notify_ai_job_termine()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.statut = 'completed' AND OLD.statut != 'completed' THEN
        INSERT INTO notifications (user_id, type, titre, contenu, lien_type, lien_id)
        VALUES (
            NEW.user_id,
            'ai_job_termine',
            'Traitement terminé',
            'Votre ' || NEW.type::text || ' est prêt.',
            'ai_job',
            NEW.id
        );
    ELSIF NEW.statut = 'failed' AND OLD.statut != 'failed' THEN
        INSERT INTO notifications (user_id, type, titre, contenu, lien_type, lien_id)
        VALUES (
            NEW.user_id,
            'ai_job_echoue',
            'Traitement échoué',
            'Votre ' || NEW.type::text || ' a échoué. Vos crédits seront remboursés.',
            'ai_job',
            NEW.id
        );
    END IF;
    RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- Rattachement des triggers
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_message_envoye ON public.messages;
CREATE TRIGGER trg_message_envoye AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION trg_message_envoye();

DROP TRIGGER IF EXISTS trg_seance_creee ON public.seances;
CREATE TRIGGER trg_seance_creee AFTER INSERT ON public.seances
  FOR EACH ROW EXECUTE FUNCTION trg_seance_creee();

DROP TRIGGER IF EXISTS trg_projet_cree ON public.projets;
CREATE TRIGGER trg_projet_cree AFTER INSERT ON public.projets
  FOR EACH ROW EXECUTE FUNCTION trg_projet_cree();

DROP TRIGGER IF EXISTS trg_projet_termine ON public.projets;
CREATE TRIGGER trg_projet_termine AFTER UPDATE ON public.projets
  FOR EACH ROW EXECUTE FUNCTION trg_projet_termine();

DROP TRIGGER IF EXISTS trg_ressource_ajoutee ON public.ressources;
CREATE TRIGGER trg_ressource_ajoutee AFTER INSERT ON public.ressources
  FOR EACH ROW EXECUTE FUNCTION trg_ressource_ajoutee();

DROP TRIGGER IF EXISTS trg_ressource_equipe_publiee ON public.bibliotheque_ressources;
CREATE TRIGGER trg_ressource_equipe_publiee AFTER INSERT ON public.bibliotheque_ressources
  FOR EACH ROW EXECUTE FUNCTION trg_ressource_equipe_publiee();

DROP TRIGGER IF EXISTS trg_setlist_ajoute ON public.seance_setlist;
CREATE TRIGGER trg_setlist_ajoute AFTER INSERT ON public.seance_setlist
  FOR EACH ROW EXECUTE FUNCTION trg_setlist_ajoute();

DROP TRIGGER IF EXISTS trg_groupe_membre_ajoute ON public.groupe_membres;
CREATE TRIGGER trg_groupe_membre_ajoute AFTER INSERT ON public.groupe_membres
  FOR EACH ROW EXECUTE FUNCTION trg_groupe_membre_ajoute();

DROP TRIGGER IF EXISTS trg_groupe_admin_nomme ON public.groupe_membres;
CREATE TRIGGER trg_groupe_admin_nomme AFTER UPDATE ON public.groupe_membres
  FOR EACH ROW EXECUTE FUNCTION trg_groupe_admin_nomme();

DROP TRIGGER IF EXISTS trg_enregistrement_ajoute ON public.seance_enregistrements;
CREATE TRIGGER trg_enregistrement_ajoute AFTER INSERT ON public.seance_enregistrements
  FOR EACH ROW EXECUTE FUNCTION trg_enregistrement_ajoute();

DROP TRIGGER IF EXISTS trg_audio_depose ON public.seance_enregistrements;
CREATE TRIGGER trg_audio_depose AFTER INSERT ON public.seance_enregistrements
  FOR EACH ROW EXECUTE FUNCTION trg_audio_depose();

DROP TRIGGER IF EXISTS trg_stems_termines ON public.seance_enregistrements;
CREATE TRIGGER trg_stems_termines AFTER UPDATE OF stems_statut ON public.seance_enregistrements
  FOR EACH ROW EXECUTE FUNCTION trg_stems_termines();

DROP TRIGGER IF EXISTS trg_generation_terminee ON public.ai_jobs;
CREATE TRIGGER trg_generation_terminee AFTER UPDATE OF statut ON public.ai_jobs
  FOR EACH ROW EXECUTE FUNCTION trg_generation_terminee();

DROP TRIGGER IF EXISTS trigger_notify_ai_job_termine ON public.ai_jobs;
CREATE TRIGGER trigger_notify_ai_job_termine AFTER UPDATE OF statut ON public.ai_jobs
  FOR EACH ROW EXECUTE FUNCTION notify_ai_job_termine();
