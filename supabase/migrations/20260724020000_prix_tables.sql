-- COUR-16 : modele enseignes/produits/offres/historique de prix. Objectif
-- du ticket : stocker des prix COMPARABLES (unites normalisees), DATES
-- (chaque observation a un timestamp) et TRACABLES (source explicite) par
-- enseigne. S'appuie sur `unites_mesure` (COUR-14) et peut relier un produit
-- canonique a un ingredient du catalogue recettes (`ingredients`, COUR-14)
-- pour le jour ou le comparateur de prix sera branche sur les listes de
-- courses reelles — lien optionnel, pas tous les produits suivis
-- correspondent a un ingredient de recette (ex. produits d'hygiene).

-- 1. Enseignes — memes codes que le type TypeScript `Enseigne` existant
-- (types/index.ts), rendus structures/referencables cote base.
create table if not exists enseignes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  nom text not null,
  constraint enseignes_code_unique unique (code)
);

insert into enseignes (code, nom) values
  ('coop', 'Coop'),
  ('migros', 'Migros'),
  ('lidl', 'Lidl'),
  ('aldi', 'Aldi'),
  ('ottos', 'Otto''s'),
  ('manor_food', 'Manor Food')
on conflict (code) do nothing;

-- 2. Produit canonique : l'idee generale du produit ("Riz basmati"),
-- independante du format ou de l'enseigne qui le vend.
create table if not exists produits_canoniques (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  rayon text check (rayon = any (array[
    'Fruits & Legumes', 'Viandes', 'Produits laitiers', 'Epicerie',
    'Conserves', 'Surgeles', 'Boissons', 'Hygiene'
  ])),
  ingredient_id uuid references ingredients(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 3. Offre magasin : un produit canonique vendu par une enseigne dans un
-- FORMAT particulier ("500g", "1kg", "pack x6"). `quantite`/`unite` portent
-- la mesure comparable (voir contrainte plus bas) ; `format` est le libelle
-- libre affiche a l'utilisateur (peut contenir des precisions non
-- comparables : "pack x6", "grand format").
create table if not exists offres_magasin (
  id uuid primary key default gen_random_uuid(),
  produit_canonique_id uuid not null references produits_canoniques(id) on delete cascade,
  enseigne_id uuid not null references enseignes(id) on delete cascade,
  format text not null,
  quantite numeric(10,3) not null check (quantite > 0),
  unite text not null references unites_mesure(code),
  code_barre text,
  actif boolean not null default true,
  constraint offres_magasin_unique unique (produit_canonique_id, enseigne_id, format),
  -- Normalisation : seules des unites physiques reellement comparables sont
  -- acceptees ici (pas 'sachet'/'paquet' etc., qui existent dans
  -- unites_mesure pour les quantites de recette mais ne permettent aucune
  -- comparaison de prix entre deux produits). C'est ce qui garantit que
  -- prix_historique.prix_unitaire (ci-dessous) est toujours comparable
  -- entre deux offres de la meme famille d'unite (masse/volume/piece).
  constraint offres_magasin_unite_comparable check (unite = any (array['g', 'kg', 'ml', 'l', 'unite']))
);

-- 4. Historique des prix : table d'evenements, APPEND-ONLY par convention
-- (aucune policy UPDATE/DELETE cote client, voir la migration RLS) — chaque
-- observation est une nouvelle ligne, jamais une mise a jour. C'est ce qui
-- constitue "l'historique" du ticket : le prix courant est simplement la
-- ligne la plus recente par offre (vue `prix_courant`, migration suivante).
create table if not exists prix_historique (
  id uuid primary key default gen_random_uuid(),
  offre_id uuid not null references offres_magasin(id) on delete cascade,
  prix numeric(10,2) not null check (prix > 0),
  prix_unitaire numeric(10,4) not null check (prix_unitaire > 0),
  promotion text,
  source text not null check (source = any (array['scraping', 'api_enseigne', 'saisie_manuelle'])),
  collecte_le timestamptz not null default now()
);
