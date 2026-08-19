-- COUR-79/80 : préférences distinctes des goûts alimentaires et des données
-- d'adresse. Une ligne par profil, accessible uniquement à son propriétaire.
create table public.preferences_courses_en_ligne (
  profil_id uuid primary key references public.profils(id) on delete cascade,
  substitution_mode text not null default 'demander'
    check (substitution_mode in ('demander', 'automatique_equivalent', 'jamais')),
  variation_prix_max_pct integer not null default 10
    check (variation_prix_max_pct between 0 and 100),
  marques_preferees text[] not null default '{}',
  marques_refusees text[] not null default '{}',
  livraison_sans_contact boolean not null default false,
  instructions_livraison text not null default ''
    check (char_length(instructions_livraison) <= 300),
  creneau_prefere text not null default 'indifferent'
    check (creneau_prefere in ('indifferent', 'matin', 'apres_midi', 'soir')),
  frais_livraison_max numeric(6,2) not null default 20
    check (frais_livraison_max between 0 and 100),
  enseignes_autorisees text[] not null default '{}'
    check (enseignes_autorisees <@ array['coop','migros','lidl','aldi','ottos','manor_food']::text[]),
  updated_at timestamptz not null default now()
);

alter table public.preferences_courses_en_ligne enable row level security;

create policy preferences_courses_en_ligne_own
  on public.preferences_courses_en_ligne
  for all
  to authenticated
  using ((select auth.uid()) = profil_id)
  with check ((select auth.uid()) = profil_id);

revoke all on table public.preferences_courses_en_ligne from anon, authenticated;
grant select, insert, update, delete on table public.preferences_courses_en_ligne to authenticated;
grant all on table public.preferences_courses_en_ligne to service_role;

comment on table public.preferences_courses_en_ligne is
  'Préférences prototype de substitution et livraison; aucune donnée de paiement ou identifiant marchand.';
