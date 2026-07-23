-- COUR-14 : modele normalise pour les recettes/ingredients, utilisable par le
-- swipe, le planning et les courses. `recettes` existait deja (COUR-9) avec
-- `ingredients`/`etapes` en jsonb/text[] denormalises — remplaces ici par des
-- tables normalisees (0 ligne en production au moment de ce ticket, verifie
-- via l'API Management avant d'ecrire cette migration : changement destructif
-- sans risque de perte de donnees reelles).

-- 1. Colonnes recettes manquantes au modele demande par le ticket : source,
-- statut de publication, nutrition detaillee (calories existait deja),
-- horodatage de mise a jour.
alter table recettes add column if not exists source text;
alter table recettes add column if not exists statut_publication text not null default 'brouillon';
alter table recettes add column if not exists proteines_g numeric(6,2);
alter table recettes add column if not exists glucides_g numeric(6,2);
alter table recettes add column if not exists lipides_g numeric(6,2);
alter table recettes add column if not exists updated_at timestamptz not null default now();

-- Contraintes : empechent les enregistrements incoherents (drop/add pour
-- rester idempotent, meme pattern que les policies du reste du schema).
alter table recettes drop constraint if exists recettes_statut_publication_check;
alter table recettes add constraint recettes_statut_publication_check
  check (statut_publication = any (array['brouillon', 'publiee', 'archivee']));

alter table recettes drop constraint if exists recettes_portions_check;
alter table recettes add constraint recettes_portions_check check (portions > 0);

alter table recettes drop constraint if exists recettes_temps_preparation_check;
alter table recettes add constraint recettes_temps_preparation_check
  check (temps_preparation is null or temps_preparation > 0);

alter table recettes drop constraint if exists recettes_calories_check;
alter table recettes add constraint recettes_calories_check
  check (calories is null or calories >= 0);

-- `recettes_a_moderer` (COUR-9) selectionne r.ingredients/r.etapes : il faut
-- la redefinir AVANT de supprimer ces colonnes, sinon Postgres refuse le
-- drop ("other objects depend on it"). Remplace la vue plutot que d'editer
-- 20260723150100_views.sql, deja marquee appliquee en production.
-- `create or replace view` ne peut pas retirer de colonnes (seulement en
-- ajouter a la fin) — il faut recreer la vue de zero.
drop view if exists recettes_a_moderer;
create view recettes_a_moderer as
select
  r.id, r.titre, r.description, r.image_url, r.blurhash, r.temps_preparation,
  r.difficulte, r.cout_estime, r.calories, r.portions, r.regime, r.allergenes,
  r.statut_publication, r.auteur_id, r.est_communautaire, r.created_at,
  count(s.id) as nb_signalements
from recettes r
left join signalements s on s.recette_id = r.id and s.statut = 'en_attente'
where r.est_communautaire = true
group by r.id
having count(s.id) >= 3
order by count(s.id) desc;

-- Ingredients/etapes deplaces vers des tables normalisees (voir plus bas) :
-- plus de jsonb/text[] libres, structure verifiable par contraintes SQL.
alter table recettes drop column if exists ingredients;
alter table recettes drop column if exists etapes;

-- 2. Unites de mesure : table de reference plutot qu'un enum fige dans une
-- contrainte CHECK, pour rester extensible sans nouvelle migration a chaque
-- nouvelle unite.
create table if not exists unites_mesure (
  code text primary key,
  libelle text not null
);

insert into unites_mesure (code, libelle) values
  ('g', 'Gramme'),
  ('kg', 'Kilogramme'),
  ('ml', 'Millilitre'),
  ('l', 'Litre'),
  ('unite', 'Unité'),
  ('cs', 'Cuillère à soupe'),
  ('cc', 'Cuillère à café'),
  ('pincee', 'Pincée'),
  ('sachet', 'Sachet'),
  ('paquet', 'Paquet')
on conflict (code) do nothing;

-- 3. Catalogue d'ingredients partage entre recettes (evite de repeter
-- "Pommes de terre" en texte libre dans chaque recette, permet un futur
-- rapprochement avec les prix par enseigne).
create table if not exists ingredients (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  rayon text check (rayon = any (array[
    'Fruits & Legumes', 'Viandes', 'Produits laitiers', 'Epicerie',
    'Conserves', 'Surgeles', 'Boissons', 'Hygiene'
  ])),
  unite_defaut text references unites_mesure(code),
  created_at timestamptz not null default now(),
  constraint ingredients_nom_unique unique (nom)
);

-- 4. Ligne d'ingredient d'une recette (quantite + unite propres a CETTE
-- recette, meme si l'ingredient catalogue est partage).
create table if not exists recette_ingredients (
  id uuid primary key default gen_random_uuid(),
  recette_id uuid not null references recettes(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete restrict,
  quantite numeric(10,2) not null check (quantite > 0),
  unite text not null references unites_mesure(code),
  ordre integer not null default 0,
  optionnel boolean not null default false,
  constraint recette_ingredients_unique unique (recette_id, ingredient_id)
);

-- 5. Etapes numerotees (remplace l'ancien text[] non structure).
create table if not exists recette_etapes (
  id uuid primary key default gen_random_uuid(),
  recette_id uuid not null references recettes(id) on delete cascade,
  numero integer not null check (numero > 0),
  instruction text not null,
  constraint recette_etapes_unique unique (recette_id, numero)
);
