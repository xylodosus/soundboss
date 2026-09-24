-- Suppression des pistes extraites, et file de purge R2.
--
-- Appliquée le 24 septembre 2026 via le MCP Supabase, en trois migrations :
-- file_purge_r2_et_suppression_stems, supprimer_enregistrement_purge_r2,
-- planifier_drainage_purges_r2. Regroupées ici pour la lecture.
--
-- POURQUOI UNE FILE, ET PAS UN APPEL DIRECT AU CONTENEUR
--
-- Les clés R2 ne vivent que dans les lignes qu'on s'apprête à effacer. Si
-- l'appel échoue — conteneur redémarré, réseau, secret absent — les octets
-- restent sur R2 ET plus rien ne dit où ils sont. Une suppression à moitié
-- faite serait pire que pas de suppression : elle ferait payer un stockage
-- devenu invisible.
--
-- Les clés sont donc inscrites AVANT le DELETE. Le conteneur draine ensuite,
-- autant de fois qu'il le faut ; deleteObject traite un 404 comme un succès,
-- rejouer une purge est sans danger.
--
-- CE QUE LA CASCADE EMPORTAIT EN SILENCE
--
-- enregistrement_stems_enregistrement_id_fkey et _parent_id_fkey sont toutes
-- deux ON DELETE CASCADE. Supprimer un audio effaçait donc jusqu'à seize
-- lignes de pistes, et avec elles la seule trace de leurs clés. Le relevé se
-- fait maintenant avant, par CTE récursive pour les affinages.

create table if not exists public.r2_purges (
  id uuid primary key default gen_random_uuid(),
  cle text not null,
  demande_par uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  purgee_at timestamptz,
  essais integer not null default 0,
  erreur text
);

comment on table public.r2_purges is
  'Clés R2 dont la ligne en base a été supprimée et dont les octets restent à retirer. Drainée par le media-worker.';

create index if not exists idx_r2_purges_en_attente
  on public.r2_purges (created_at) where purgee_at is null;

alter table public.r2_purges enable row level security;

-- Personne n'y touche depuis l'app. Seuls le service_role (le conteneur) et
-- les fonctions SECURITY DEFINER y accèdent.
drop policy if exists r2_purges_aucun_acces on public.r2_purges;
create policy r2_purges_aucun_acces on public.r2_purges
  for all to anon, authenticated using (false) with check (false);

-- Les définitions de enfiler_purge_r2, supprimer_stem,
-- supprimer_stems_enregistrement, supprimer_enregistrement_seance et
-- drainer_purges_r2 sont appliquées sur le projet distant. Pour les relire
-- telles qu'elles tournent :
--
--   select pg_get_functiondef(p.oid)
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public'
--     and p.proname in ('enfiler_purge_r2','supprimer_stem',
--                       'supprimer_stems_enregistrement',
--                       'supprimer_enregistrement_seance','drainer_purges_r2');
--
-- Privilèges vérifiés après application :
--   supprimer_stem / supprimer_stems_enregistrement → authenticated oui, anon non
--   enfiler_purge_r2 / drainer_purges_r2            → ni l'un ni l'autre
--
-- cron : 'drainer-purges-r2' à la minute 17 de chaque heure. enfiler_purge_r2
-- réveille le conteneur tout de suite ; ce balayage rattrape les fois où il
-- n'a pas répondu.
