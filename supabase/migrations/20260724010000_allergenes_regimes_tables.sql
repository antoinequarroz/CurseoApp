-- COUR-15 : allergenes et regimes deviennent des entites structurees (plus du
-- texte libre `recettes.allergenes text[]` / `recettes.regime text[]`), avec
-- un mecanisme de synonymes et une distinction explicite entre allergene
-- declare par l'auteur et allergene deduit des ingredients. `recettes` a
-- toujours 0 ligne en production (reverifie avant cette migration) :
-- changement destructif sans risque de perte reelle, meme logique que COUR-14.

create extension if not exists unaccent with schema extensions;

-- 1. Referentiels. 14 allergenes a declaration obligatoire (reglementation
-- UE/CH), codes stables (pas de code numerique arbitraire) pour rester
-- lisibles dans les migrations et les logs.
create table if not exists allergenes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  libelle text not null,
  constraint allergenes_code_unique unique (code)
);

insert into allergenes (code, libelle) values
  ('gluten', 'Gluten'),
  ('crustaces', 'Crustacés'),
  ('oeuf', 'Œufs'),
  ('poisson', 'Poisson'),
  ('arachide', 'Arachides'),
  ('soja', 'Soja'),
  ('lactose', 'Lait / lactose'),
  ('fruits_a_coque', 'Fruits à coque'),
  ('celeri', 'Céleri'),
  ('moutarde', 'Moutarde'),
  ('sesame', 'Graines de sésame'),
  ('sulfites', 'Anhydride sulfureux et sulfites'),
  ('lupin', 'Lupin'),
  ('mollusques', 'Mollusques')
on conflict (code) do nothing;

-- Regimes : mêmes codes que le type TypeScript `Regime` existant
-- (types/index.ts) — pas de renommage, juste la meme liste rendue
-- structuree/referencable au lieu de vivre uniquement cote client.
create table if not exists regimes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  libelle text not null,
  constraint regimes_code_unique unique (code)
);

insert into regimes (code, libelle) values
  ('vegetarien', 'Végétarien'),
  ('vegan', 'Végan'),
  ('halal', 'Halal'),
  ('sans_gluten', 'Sans gluten'),
  ('sans_lactose', 'Sans lactose'),
  ('sans_noix', 'Sans noix'),
  ('poisson', 'Pescatarien')
on conflict (code) do nothing;

-- 2. Synonymes : couvre les variantes courantes (arachide/cacahuète, etc.)
-- pour qu'une saisie libre utilisateur ou un nom d'ingredient se resolve
-- vers l'allergene canonique. `terme` est stocke normalise (minuscule, sans
-- accent, espaces simples) — voir fn_normaliser_terme dans la migration
-- suivante, qui applique la meme normalisation a la recherche.
create table if not exists synonymes_allergenes (
  id uuid primary key default gen_random_uuid(),
  terme text not null,
  allergene_id uuid not null references allergenes(id) on delete cascade,
  constraint synonymes_allergenes_terme_unique unique (terme)
);

-- Chaque code canonique est son propre synonyme, pour que la resolution
-- n'ait qu'un seul chemin de recherche (pas de "essaie d'abord le code, puis
-- la table de synonymes si echec").
insert into synonymes_allergenes (terme, allergene_id)
select a.code, a.id from allergenes a
on conflict (terme) do nothing;

insert into synonymes_allergenes (terme, allergene_id)
select variante.terme, a.id
from allergenes a
join (values
  ('arachide', array['arachides', 'cacahuete', 'cacahuetes', 'cacahouete', 'cacahouetes', 'peanut']),
  ('fruits_a_coque', array['fruits a coque', 'noix', 'amande', 'amandes', 'noisette', 'noisettes', 'noix de cajou', 'pistache', 'pistaches', 'noix de pecan']),
  ('lactose', array['lait', 'produits laitiers', 'produit laitier']),
  ('oeuf', array['oeufs', 'egg', 'eggs']),
  ('gluten', array['ble', 'froment', 'orge', 'seigle']),
  ('poisson', array['poissons', 'fish']),
  ('crustaces', array['crevette', 'crevettes', 'crabe', 'homard']),
  ('soja', array['soya']),
  ('sesame', array['graines de sesame', 'tahini']),
  ('sulfites', array['anhydride sulfureux', 'so2']),
  ('mollusques', array['moules', 'huitres', 'escargot', 'escargots'])
) as v(code, variantes) on a.code = v.code
cross join lateral unnest(v.variantes) as variante(terme)
on conflict (terme) do nothing;

-- 3. Allergenes portes par un ingredient du catalogue. `certitude` distingue
-- "cet ingredient contient toujours cet allergene" de "risque connu mais pas
-- systematique" (ex. traces de gluten par contamination croisee) — c'est ce
-- qui permet a la deduction de ne jamais transformer un cas ambigu en "sans
-- risque". Un ingredient absent de cette table n'implique PAS "sans
-- allergene" : ca signifie juste "pas encore catalogue" (limite documentee,
-- pas une garantie de securite).
create table if not exists ingredient_allergenes (
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  allergene_id uuid not null references allergenes(id) on delete cascade,
  certitude text not null check (certitude = any (array['confirme', 'possible'])),
  primary key (ingredient_id, allergene_id)
);

-- 4. Allergenes EXPLICITEMENT declares par l'auteur de la recette (remplace
-- l'ancien `recettes.allergenes text[]`). Distinct des allergenes deduits
-- des ingredients (recette_allergenes_effectifs, migration suivante) : un
-- auteur peut declarer un allergene meme si aucun ingredient catalogue ne le
-- justifie (ex. contamination croisee en cuisine).
create table if not exists recette_allergenes (
  recette_id uuid not null references recettes(id) on delete cascade,
  allergene_id uuid not null references allergenes(id) on delete cascade,
  primary key (recette_id, allergene_id)
);

create table if not exists recette_regimes (
  recette_id uuid not null references recettes(id) on delete cascade,
  regime_id uuid not null references regimes(id) on delete cascade,
  primary key (recette_id, regime_id)
);

-- `recettes_a_moderer` (COUR-9/14) selectionne r.regime/r.allergenes : a
-- redefinir AVANT de supprimer ces colonnes (meme piege qu'en COUR-14 —
-- `create or replace view` ne peut pas retirer de colonnes).
drop view if exists recettes_a_moderer;
create view recettes_a_moderer as
select
  r.id, r.titre, r.description, r.image_url, r.blurhash, r.temps_preparation,
  r.difficulte, r.cout_estime, r.calories, r.portions,
  r.statut_publication, r.auteur_id, r.est_communautaire, r.created_at,
  count(s.id) as nb_signalements
from recettes r
left join signalements s on s.recette_id = r.id and s.statut = 'en_attente'
where r.est_communautaire = true
group by r.id
having count(s.id) >= 3
order by count(s.id) desc;

alter table recettes drop column if exists regime;
alter table recettes drop column if exists allergenes;
