-- Durée d'une note vocale, pour que la bulle l'affiche sans charger le fichier.
--
-- Appliquée le 7 septembre 2026 via le MCP Supabase.
--
-- useEnvoyerMessage acceptait déjà `fichier.duree` mais ne l'écrivait nulle
-- part, faute de colonne. Sans elle, la durée n'apparaîtrait qu'après
-- téléchargement de l'audio — soit, pour une note qu'on ouvre pour la lire
-- vite, exactement l'inverse de ce qu'on cherche. Sur une connexion mesurée,
-- ouvrir une discussion rapatrierait toutes les notes qu'elle contient.
--
-- Nullable : les messages vocaux déjà envoyés n'en ont pas, et la bulle se
-- replie alors sur la durée lue par le lecteur au premier appui.
alter table public.messages
  add column if not exists duree_secondes integer;

comment on column public.messages.duree_secondes is
  'Durée en secondes d''une note vocale. Null pour les messages antérieurs et les autres types.';
