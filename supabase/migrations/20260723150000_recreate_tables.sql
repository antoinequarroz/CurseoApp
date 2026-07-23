-- COUR-9 : recree en migration versionnee les tables qui existaient deja en
-- production sans jamais avoir ete capturees dans un fichier de migration
-- (voir supabase/SCHEMA_INVENTORY.md, COUR-8, pour le detail des ecarts).
-- Idempotent (IF NOT EXISTS) : ne fait rien si la table existe deja, pour
-- pouvoir etre applique tel quel a la production existante comme a un
-- environnement neuf. Ordre : respecte les dependances de cles etrangeres.

create table if not exists profils (
  id uuid primary key references auth.users(id),
  prenom text,
  nb_personnes integer default 1,
  nb_enfants integer default 0,
  budget_hebdo numeric(10,2),
  regime text[] default '{}'::text[],
  allergies text[] default '{}'::text[],
  objectifs text[] default '{}'::text[],
  enseignes_favorites text[] default '{}'::text[],
  abonnement text default 'gratuit'::text
    check (abonnement = any (array['gratuit', 'standard', 'premium', 'famille'])),
  apparence text default 'auto'::text
    check (apparence = any (array['auto', 'clair', 'sombre'])),
  notifications_activees boolean default true,
  notifications_planning boolean default true,
  notifications_budget boolean default true,
  notifications_promos boolean default false,
  notifications_bilan boolean default true,
  est_admin boolean default false,
  cgvu_version_acceptee text,
  cgvu_acceptee_le timestamptz,
  deleted_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists recettes (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  description text,
  image_url text,
  blurhash text,
  temps_preparation integer,
  difficulte text check (difficulte = any (array['facile', 'moyen', 'difficile'])),
  cout_estime numeric(10,2),
  calories integer,
  portions integer default 4,
  regime text[] default '{}'::text[],
  allergenes text[] default '{}'::text[],
  ingredients jsonb not null default '[]'::jsonb,
  etapes text[] default '{}'::text[],
  auteur_id uuid references profils(id),
  est_communautaire boolean default false,
  created_at timestamptz default now()
);

create table if not exists planning_repas (
  id uuid primary key default gen_random_uuid(),
  profil_id uuid references profils(id) on delete cascade,
  semaine_debut date not null,
  repas jsonb not null,
  created_at timestamptz default now()
);

create table if not exists listes_courses (
  id uuid primary key default gen_random_uuid(),
  profil_id uuid references profils(id) on delete cascade,
  planning_id uuid references planning_repas(id),
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);

create table if not exists commandes (
  id uuid primary key default gen_random_uuid(),
  profil_id uuid references profils(id) on delete cascade,
  liste_id uuid references listes_courses(id),
  paniers jsonb,
  montant_total numeric(10,2),
  economies numeric(10,2),
  statut text default 'validee'::text,
  created_at timestamptz default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  profil_id uuid references profils(id) on delete cascade,
  type text not null
    check (type = any (array['billing_issue', 'planning', 'budget', 'promo', 'bilan', 'autre'])),
  titre text not null,
  message text not null,
  lue boolean default false,
  created_at timestamptz default now()
);

create table if not exists favoris (
  profil_id uuid not null references profils(id) on delete cascade,
  recette_id uuid not null references recettes(id) on delete cascade,
  primary key (profil_id, recette_id)
);

create table if not exists swipes (
  profil_id uuid not null references profils(id) on delete cascade,
  recette_id uuid not null references recettes(id) on delete cascade,
  aime boolean not null,
  created_at timestamptz default now(),
  primary key (profil_id, recette_id)
);

create table if not exists signalements (
  id uuid primary key default gen_random_uuid(),
  recette_id uuid references recettes(id) on delete cascade,
  signale_par uuid references profils(id) on delete cascade,
  raison text not null
    check (raison = any (array['contenu_inapproprie', 'spam_publicite', 'information_incorrecte', 'plagiat', 'autre'])),
  detail text,
  statut text default 'en_attente'::text
    check (statut = any (array['en_attente', 'examine', 'supprime', 'valide'])),
  created_at timestamptz default now(),
  unique (recette_id, signale_par)
);

-- Ces deux tables existaient deja en production avant la seule migration
-- versionnee jusqu'ici (20260715080000), qui n'activait que leur RLS sans
-- jamais les creer explicitement.
create table if not exists rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  requests integer default 1,
  window_start timestamptz default now(),
  primary key (user_id, endpoint)
);

create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text default 'landing'::text,
  created_at timestamptz default now()
);
