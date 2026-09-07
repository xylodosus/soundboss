-- Clôture des générations dont le rappel de Kie.ai n'est jamais arrivé.
--
-- Appliquée le 7 septembre 2026 via le MCP Supabase.
--
-- Le rappel est le seul mécanisme de fin, et rien ne le garantit : un
-- redémarrage du conteneur, une adresse publique changée, un échec d'émission
-- chez Kie.ai, et le job reste `processing` indéfiniment. L'écran annonce
-- « en cours » pour toujours, alors que le quota du jour a été consommé.
--
-- Le conteneur ne conclut pas d'après le temps écoulé : il interroge
-- GET /api/v1/generate/record-info, qui seul sait si les pistes existent. Le
-- statut CALLBACK_EXCEPTION désigne exactement ce cas — génération aboutie,
-- rappel perdu — et le traiter comme un échec jetterait deux pistes payées.
-- Le temps ne tranche qu'en dernier recours, à 60 minutes.

create extension if not exists pg_cron;

create or replace function public.reconcilier_generations()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_secret text;
  v_url text;
begin
  select valeur into v_secret from app_secrets where cle = 'media_worker_secret';
  select valeur into v_url from app_secrets where cle = 'media_worker_url';

  -- Sans secret ni adresse, ne rien faire plutôt qu'émettre un appel anonyme :
  -- le conteneur le refuserait, et l'erreur serait muette ici.
  if v_secret is null or v_url is null then
    return;
  end if;

  -- Aucun job en suspens : ne pas réveiller le conteneur pour rien.
  if not exists (
    select 1 from ai_jobs
    where provider = 'kie-suno' and statut in ('queued', 'processing')
  ) then
    return;
  end if;

  perform net.http_post(
    url := rtrim(v_url, '/') || '/jobs/generations/reconcilier',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret));
end;
$$;

-- Les privilèges par défaut de Supabase accordent EXECUTE à anon : un REVOKE
-- FROM PUBLIC seul ne suffit pas à le retirer.
-- Vérifié après application : ACL {postgres=X/postgres, service_role=X/postgres},
-- has_function_privilege('anon', …) et ('authenticated', …) tous deux faux.
revoke all on function public.reconcilier_generations() from public, anon, authenticated;

select cron.unschedule('reconcilier-generations')
where exists (select 1 from cron.job where jobname = 'reconcilier-generations');

select cron.schedule(
  'reconcilier-generations',
  '*/10 * * * *',
  $cron$select public.reconcilier_generations();$cron$);
