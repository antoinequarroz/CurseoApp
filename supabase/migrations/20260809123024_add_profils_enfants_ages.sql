-- L'onboarding collecte l'age de chaque enfant et envoie ce champ lors de
-- l'upsert initial du profil. La colonne manquante faisait echouer toute la
-- requete REST avec PGRST204 et bloquait les nouveaux utilisateurs.
alter table public.profils
  add column if not exists enfants_ages integer[] not null default '{}'::integer[];

comment on column public.profils.enfants_ages is
  'Ages des enfants du foyer, en annees (0 a 17), dans l ordre de saisie.';
