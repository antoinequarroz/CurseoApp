-- COUR-23 : modelise le foyer comme entite a part entiere, avec plusieurs
-- membres distincts (regime/allergies/gouts/objectifs par personne), au lieu
-- du modele actuel ou `profils` porte a la fois le compte authentifie ET les
-- preferences agregees de tout le foyer (nb_personnes/nb_enfants/enfants_ages
-- sans identite individuelle, voir types/index.ts). `profils.regime` /
-- `profils.allergies` / `profils.objectifs` (foyer-wide) restent en place
-- pour ne rien casser cote app existante : ce sont les preferences par
-- defaut/du responsable tant que COUR-24/COUR-25 (bloques par ce ticket) ne
-- branchent pas l'UI sur `membres_foyer`. Ticket backend/schema uniquement,
-- pas de changement client.

create table if not exists foyers (
  id uuid primary key default gen_random_uuid(),
  responsable_id uuid not null references profils(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint foyers_responsable_unique unique (responsable_id)
);

-- Un membre peut avoir un compte de connexion (profil_id renseigne, ex. un
-- ado avec son propre acces) ou non (ex. jeune enfant) : profil_id est
-- nullable expres. L'isolation entre foyers repose uniquement sur foyer_id,
-- jamais sur profil_id (sinon un membre sans compte ne serait protege par
-- rien).
create table if not exists membres_foyer (
  id uuid primary key default gen_random_uuid(),
  foyer_id uuid not null references foyers(id) on delete cascade,
  profil_id uuid references profils(id) on delete set null,
  prenom text not null,
  est_responsable boolean not null default false,
  age integer check (age is null or age >= 0),
  regime text[] not null default '{}'::text[],
  allergies text[] not null default '{}'::text[],
  objectifs text[] not null default '{}'::text[],
  -- Gouts : memes champs que le sondage local (stores/goutsStore.ts,
  -- SondageGouts) — pas encore synchronise cote client (COUR-24/25).
  gouts_frequence_viande text
    check (gouts_frequence_viande is null or gouts_frequence_viande = any (array['jamais', 'rarement', 'parfois', 'souvent', 'quotidien'])),
  gouts_frequence_poisson text
    check (gouts_frequence_poisson is null or gouts_frequence_poisson = any (array['jamais', 'rarement', 'parfois', 'souvent', 'quotidien'])),
  gouts_produits_favoris text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  constraint membres_foyer_profil_unique unique (profil_id)
);

-- Au plus un membre "responsable" par foyer (celui qui correspond a
-- foyers.responsable_id) : evite une incoherence si un membre non-responsable
-- est marque a tort comme tel.
create unique index if not exists membres_foyer_un_seul_responsable
  on membres_foyer (foyer_id) where est_responsable;
