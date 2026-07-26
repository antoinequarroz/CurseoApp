-- COUR-28 : aucune notion d'adresse n'existait dans le schema (recherche
-- confirmee sur toutes les migrations existantes) — l'ecran "Adresses de
-- livraison" etait jusqu'ici un teaser desactive cote client (COUR-9/profil.tsx),
-- pas un backend jamais branche comme `repas_planifies` avant COUR-27.
create table if not exists adresses_livraison (
  id uuid primary key default gen_random_uuid(),
  profil_id uuid not null references profils(id) on delete cascade,
  libelle text not null,
  rue text not null,
  npa text not null check (npa ~ '^[0-9]{4}$'),
  ville text not null,
  complement text,
  -- Une seule adresse par defaut par profil (partial unique index plutot
  -- qu'un simple boolean sans contrainte) : evite l'incoherence "deux
  -- adresses par defaut en meme temps" au niveau base, pas juste applicatif.
  est_defaut boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists adresses_livraison_un_seul_defaut
  on adresses_livraison (profil_id) where est_defaut;
