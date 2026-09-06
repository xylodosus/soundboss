-- Lot E5 — demande de génération musicale.
--
-- Aucune table à créer : `ai_jobs` existait déjà avec `provider_job_id`,
-- `resultat`, `credits_cout` et `cout_api_reel`, et l'énumération `ai_job_type`
-- contient `generation_musique`.
--
-- À appliquer via le MCP Supabase ou l'éditeur SQL.

create or replace function public.demander_generation(
  p_prompt text,
  p_custom_mode boolean default false,
  p_instrumental boolean default false,
  p_style text default null,
  p_titre text default null,
  p_duree integer default null,
  p_modele text default 'V5_5',
  p_projet_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_utilisateur uuid := auth.uid();
  v_compteur integer;
  v_job uuid;
  v_secret text;
  v_url text;
  -- Plafond journalier, même rôle que pour les stems : empêcher qu'un testeur
  -- épuise le crédit Kie.ai en un après-midi. Ce n'est pas la facturation.
  c_plafond constant integer := 10;
  -- Coût en crédits, à ajuster quand le tarif réel de Kie.ai sera connu.
  c_credits constant integer := 2;
begin
  if v_utilisateur is null then
    return jsonb_build_object('success', false, 'message', 'Non authentifié.');
  end if;

  if p_custom_mode and (coalesce(trim(p_style), '') = '' or coalesce(trim(p_titre), '') = '') then
    return jsonb_build_object('success', false, 'message', 'Le mode personnalisé exige un style et un titre.');
  end if;

  -- En personnalisé instrumental, le style suffit à décrire le morceau.
  if coalesce(trim(p_prompt), '') = '' and not (p_custom_mode and p_instrumental) then
    return jsonb_build_object('success', false, 'message', 'Une description est nécessaire.');
  end if;

  insert into quotas_ia (utilisateur_id, jour, service, compteur)
  values (v_utilisateur, current_date, 'generation', 0)
  on conflict (utilisateur_id, jour, service) do nothing;

  select compteur into v_compteur from quotas_ia
  where utilisateur_id = v_utilisateur and jour = current_date and service = 'generation';

  if v_compteur >= c_plafond then
    return jsonb_build_object(
      'success', false,
      'message', format('Limite de %s générations par jour atteinte. Réessaie demain.', c_plafond));
  end if;

  select valeur into v_secret from app_secrets where cle = 'media_worker_secret';
  select valeur into v_url from app_secrets where cle = 'media_worker_url';
  if v_secret is null or v_url is null then
    return jsonb_build_object('success', false, 'message', 'Service de génération indisponible.');
  end if;

  insert into ai_jobs (user_id, type, statut, input_params, projet_id, credits_cout, provider)
  values (
    v_utilisateur,
    case when p_instrumental then 'generation_instrumental'::ai_job_type
         else 'generation_musique'::ai_job_type end,
    'queued'::ai_job_statut,
    jsonb_strip_nulls(jsonb_build_object(
      'prompt', p_prompt,
      'customMode', p_custom_mode,
      'instrumental', p_instrumental,
      'style', p_style,
      'title', p_titre,
      'duration', p_duree,
      'model', p_modele)),
    p_projet_id,
    c_credits,
    'kie-suno')
  returning id into v_job;

  -- Le compteur ne monte qu'une fois la demande réellement engagée.
  update quotas_ia set compteur = compteur + 1
  where utilisateur_id = v_utilisateur and jour = current_date and service = 'generation';

  perform net.http_post(
    url := rtrim(v_url, '/') || '/jobs/generer',
    body := jsonb_build_object('job_id', v_job),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret));

  return jsonb_build_object(
    'success', true,
    'message', 'Génération lancée. Elle prend quelques minutes.',
    'data', jsonb_build_object('job_id', v_job, 'restant', c_plafond - v_compteur - 1));
end;
$$;

-- Les privilèges par défaut de Supabase accordent EXECUTE à anon : un REVOKE
-- FROM PUBLIC seul ne suffit pas à le retirer.
revoke all on function public.demander_generation(text, boolean, boolean, text, text, integer, text, uuid) from public, anon;
grant execute on function public.demander_generation(text, boolean, boolean, text, text, integer, text, uuid) to authenticated;
