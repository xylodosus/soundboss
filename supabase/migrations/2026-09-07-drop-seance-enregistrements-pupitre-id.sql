-- Suppression de seance_enregistrements.pupitre_id, remplacée par pupitre_ids.
--
-- Appliquée le 7 septembre 2026 via le MCP Supabase.
--
-- Vérifications faites avant application, dans cet ordre :
--
-- 1. Code : aucune requête ne lit ni n'écrit la colonne. Les occurrences de
--    `pupitre_id` restantes portent toutes sur la table `messages` du chat,
--    qui est une autre table et garde la sienne.
-- 2. RLS : la politique `enregistrements_select` ne consulte que `pupitre_ids`,
--    via `unnest(...)` et `est_membre_pupitre()`.
-- 3. Fonctions et triggers : aucune des cinq fonctions citant la table, ni
--    aucun des trois triggers, ne mentionne la colonne simple.
-- 4. Données : sur 11 lignes, 3 portaient encore une valeur, toutes déjà
--    présentes dans `pupitre_ids`. Aucune information perdue.
--
-- L'index dédié est retiré explicitement. Il tomberait de toute façon avec la
-- colonne, mais le nommer documente ce qui disparaît.
drop index if exists public.idx_seance_enregistrements_pupitre;

alter table public.seance_enregistrements
  drop column if exists pupitre_id;
