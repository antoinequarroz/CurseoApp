-- Schema Courseo MVP — a executer dans l'editeur SQL Supabase (ou via migrations).
-- Convention : toutes les tables portant des donnees utilisateur ont RLS active
-- et une policy "own" basee sur auth.uid().

-- =========================================================================
-- Extensions
-- =========================================================================
create extension if not exists "pgcrypto";

-- =========================================================================
-- Profils utilisateurs
-- =========================================================================
create table profils (
  id uuid primary key references auth.users(id),
  prenom text,
  nb_personnes integer default 1,
  nb_enfants integer default 0,
  budget_hebdo decimal(10,2),
  regime text[] default '{}',
  allergies text[] default '{}',
  objectifs text[] default '{}',
  enseignes_favorites text[] default '{}',
  abonnement text default 'gratuit' check (abonnement in ('gratuit','standard','premium','famille')),
  apparence text default 'auto' check (apparence in ('auto','clair','sombre')),
  notifications_activees boolean default true,
  notifications_planning boolean default true,
  notifications_budget boolean default true,
  notifications_promos boolean default false,
  notifications_bilan boolean default true,
  est_admin boolean default false,
  cgvu_version_acceptee text default null,
  cgvu_acceptee_le timestamptz default null,
  deleted_at timestamptz default null,
  created_at timestamptz default now()
);

-- Vue filtree : ne retourne jamais les profils supprimes (droit a l'effacement nLPD)
create view profils_actifs as
  select * from profils where deleted_at is null;

-- =========================================================================
-- Recettes
-- =========================================================================
create table recettes (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  description text,
  image_url text,
  blurhash text,
  temps_preparation integer,
  difficulte text check (difficulte in ('facile','moyen','difficile')),
  cout_estime decimal(10,2),
  calories integer,
  portions integer default 4,
  regime text[] default '{}',
  allergenes text[] default '{}',
  ingredients jsonb not null default '[]',
  etapes text[] default '{}',
  auteur_id uuid references profils(id),
  est_communautaire boolean default false,
  created_at timestamptz default now()
);

-- =========================================================================
-- Planning des repas
-- =========================================================================
create table planning_repas (
  id uuid primary key default gen_random_uuid(),
  profil_id uuid references profils(id) on delete cascade,
  semaine_debut date not null,
  repas jsonb not null,
  created_at timestamptz default now()
);

-- =========================================================================
-- Listes de courses
-- =========================================================================
create table listes_courses (
  id uuid primary key default gen_random_uuid(),
  profil_id uuid references profils(id) on delete cascade,
  planning_id uuid references planning_repas(id),
  items jsonb not null default '[]',
  created_at timestamptz default now()
);

-- =========================================================================
-- Favoris recettes
-- =========================================================================
create table favoris (
  profil_id uuid references profils(id) on delete cascade,
  recette_id uuid references recettes(id) on delete cascade,
  primary key (profil_id, recette_id)
);

-- =========================================================================
-- Swipes recettes (algorithme d'apprentissage)
-- =========================================================================
create table swipes (
  profil_id uuid references profils(id) on delete cascade,
  recette_id uuid references recettes(id) on delete cascade,
  aime boolean not null,
  created_at timestamptz default now(),
  primary key (profil_id, recette_id)
);

-- =========================================================================
-- Historique des commandes
-- =========================================================================
create table commandes (
  id uuid primary key default gen_random_uuid(),
  profil_id uuid references profils(id) on delete cascade,
  liste_id uuid references listes_courses(id),
  paniers jsonb,
  montant_total decimal(10,2),
  economies decimal(10,2),
  statut text default 'validee',
  created_at timestamptz default now()
);

-- =========================================================================
-- Signalements de recettes communautaires (moderation)
-- =========================================================================
create table signalements (
  id uuid primary key default gen_random_uuid(),
  recette_id uuid references recettes(id) on delete cascade,
  signale_par uuid references profils(id) on delete cascade,
  raison text not null check (raison in (
    'contenu_inapproprie','spam_publicite','information_incorrecte','plagiat','autre'
  )),
  detail text,
  statut text default 'en_attente' check (statut in ('en_attente','examine','supprime','valide')),
  created_at timestamptz default now(),
  unique(recette_id, signale_par)
);

create view recettes_a_moderer as
  select r.*, count(s.id) as nb_signalements
  from recettes r
  left join signalements s on s.recette_id = r.id and s.statut = 'en_attente'
  where r.est_communautaire = true
  group by r.id
  having count(s.id) >= 3
  order by nb_signalements desc;

-- =========================================================================
-- Rate limiting (Edge Functions)
-- =========================================================================
create table rate_limits (
  user_id uuid references auth.users(id) on delete cascade,
  endpoint text not null,
  requests integer default 1,
  window_start timestamptz default now(),
  primary key (user_id, endpoint)
);

-- =========================================================================
-- Liste d'attente pre-lancement
-- =========================================================================
create table waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  source text default 'landing',
  created_at timestamptz default now()
);

-- =========================================================================
-- Index de performance
-- =========================================================================
create index idx_planning_profil on planning_repas(profil_id);
create index idx_planning_semaine on planning_repas(profil_id, semaine_debut desc);
create index idx_courses_profil on listes_courses(profil_id);
create index idx_courses_planning on listes_courses(planning_id);
create index idx_swipes_profil on swipes(profil_id);
create index idx_swipes_recette on swipes(recette_id);
create index idx_favoris_profil on favoris(profil_id);
create index idx_commandes_profil on commandes(profil_id, created_at desc);
create index idx_recettes_communautaires on recettes(est_communautaire) where est_communautaire = true;
create index idx_recettes_regime on recettes using gin(regime);
create index idx_recettes_allergenes on recettes using gin(allergenes);
create index idx_rate_limits on rate_limits(user_id, endpoint, window_start);

-- =========================================================================
-- Row Level Security
-- =========================================================================
alter table profils enable row level security;
create policy "profil_own" on profils using (auth.uid() = id);

alter table planning_repas enable row level security;
create policy "planning_own" on planning_repas using (auth.uid() = profil_id);

alter table listes_courses enable row level security;
create policy "courses_own" on listes_courses using (auth.uid() = profil_id);

alter table swipes enable row level security;
create policy "swipes_own" on swipes using (auth.uid() = profil_id);

alter table favoris enable row level security;
create policy "favoris_own" on favoris using (auth.uid() = profil_id);

alter table commandes enable row level security;
create policy "commandes_own" on commandes using (auth.uid() = profil_id);

alter table recettes enable row level security;
create policy "recettes_read" on recettes for select using (true);
create policy "recettes_write" on recettes for all using (auth.uid() = auteur_id);

alter table signalements enable row level security;
create policy "signalement_insert" on signalements for insert with check (auth.uid() = signale_par);
create policy "signalement_read_own" on signalements for select using (auth.uid() = signale_par);

-- =========================================================================
-- Storage — bucket images (recettes communautaires)
-- =========================================================================
insert into storage.buckets (id, name, public) values ('images', 'images', true)
  on conflict (id) do nothing;

create policy "images_read" on storage.objects for select using (bucket_id = 'images');

create policy "images_write" on storage.objects for insert
  with check (
    bucket_id = 'images' and
    auth.uid()::text = (storage.foldername(name))[2]
  );

create policy "images_delete" on storage.objects for delete
  using (
    bucket_id = 'images' and
    auth.uid()::text = (storage.foldername(name))[2]
  );
