-- COUR-10/COUR-11/COUR-14 : donnees de seed minimales et anonymes pour
-- developper et tester sans copier de donnees personnelles de production.
-- Execute automatiquement par `supabase db reset`. Deterministe et
-- reexecutable a l'identique (dates fixes, ids fixes, `on conflict do
-- nothing`) : jamais de donnee reelle, jamais de `now()`/valeur aleatoire
-- dans les donnees seedees elles-memes. Couvre les parcours minimaux : un
-- utilisateur fictif, un foyer (profil), 5 recettes normalisees (COUR-14 :
-- ingredients/etapes en tables, plus en jsonb/text[]), un planning, une
-- liste de courses.

-- Utilisateur de demonstration (auth.users minimal pour dev local uniquement
-- — ce flux n'existe pas en production, ou l'auth passe par Supabase Auth
-- reel/Sign in with Apple).
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated', 'demo@coursia.test',
  crypt('demo-password-non-utilise', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}', '{}'
) on conflict (id) do nothing;

insert into profils (
  id, prenom, nb_personnes, nb_enfants, budget_hebdo, regime, allergies,
  objectifs, enseignes_favorites, abonnement
) values (
  '11111111-1111-1111-1111-111111111111', 'Foyer Demo', 2, 0, 150,
  array['vegetarien']::text[], array[]::text[], array['manger_sain']::text[],
  array['migros', 'coop']::text[], 'gratuit'
) on conflict (id) do nothing;

-- 5 recettes reprises de lib/mocks/recettes.mock.ts, pour tester le
-- filtrage regime/allergies cote base plutot que le mock client. COUR-14 :
-- ingredients/etapes en tables normalisees. COUR-15 : regime/allergenes
-- egalement en tables normalisees (recette_regimes/recette_allergenes),
-- plus en colonnes text[] sur `recettes`.
insert into recettes (
  id, titre, description, image_url, blurhash, temps_preparation, difficulte,
  cout_estime, calories, portions, source, statut_publication, est_communautaire
) values
  (
    '22222222-2222-2222-2222-222222222201',
    'Rösti au fromage et oeuf au plat',
    'Le classique suisse : röstis dorés, fromage fondant et oeuf au plat.',
    'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5',
    'L6Pj0^jE.AyE_3t7t7R**0o#DgR4', 35, 'moyen', 12.5, 620, 4,
    'maison', 'publiee', false
  ),
  (
    '22222222-2222-2222-2222-222222222202',
    'Fondue moitié-moitié',
    'Fondue traditionnelle gruyère-vacherin, pain de campagne.',
    'https://images.unsplash.com/photo-1573821663912-6df460f9c684',
    'L5Q9_@of00WB~qofofof9Faz%2ay', 25, 'facile', 22, 780, 4,
    'maison', 'publiee', false
  ),
  (
    '22222222-2222-2222-2222-222222222203',
    'Buddha bowl vegan',
    'Bowl complet quinoa, legumes rotis et sauce tahini.',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd',
    'L6Pj0^jE.AyE_3t7t7R**0o#DgR4', 30, 'facile', 14, 480, 2,
    'maison', 'publiee', false
  ),
  (
    '22222222-2222-2222-2222-222222222204',
    'Saumon grillé, asperges vertes',
    'Pave de saumon grille, asperges vertes vapeur, citron.',
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288',
    'L6Pj0^jE.AyE_3t7t7R**0o#DgR4', 20, 'facile', 18, 410, 2,
    'maison', 'publiee', false
  ),
  (
    '22222222-2222-2222-2222-222222222205',
    'Curry de lentilles corail',
    'Curry de lentilles corail au lait de coco, riz basmati.',
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe',
    'L6Pj0^jE.AyE_3t7t7R**0o#DgR4', 30, 'facile', 9, 520, 4,
    'maison', 'publiee', false
  )
on conflict (id) do nothing;

-- Catalogue d'ingredients (COUR-14) partage entre les recettes ci-dessus.
insert into ingredients (id, nom, rayon, unite_defaut) values
  ('55555555-5555-5555-5555-555555555501', 'Pommes de terre', 'Fruits & Legumes', 'kg'),
  ('55555555-5555-5555-5555-555555555502', 'Gruyère râpé', 'Produits laitiers', 'g'),
  ('55555555-5555-5555-5555-555555555503', 'Gruyère', 'Produits laitiers', 'g'),
  ('55555555-5555-5555-5555-555555555504', 'Vacherin fribourgeois', 'Produits laitiers', 'g'),
  ('55555555-5555-5555-5555-555555555505', 'Quinoa', 'Epicerie', 'g'),
  ('55555555-5555-5555-5555-555555555506', 'Patate douce', 'Fruits & Legumes', 'unite'),
  ('55555555-5555-5555-5555-555555555507', 'Pave de saumon', 'Viandes', 'unite'),
  ('55555555-5555-5555-5555-555555555508', 'Asperges vertes', 'Fruits & Legumes', 'g'),
  ('55555555-5555-5555-5555-555555555509', 'Lentilles corail', 'Epicerie', 'g'),
  ('55555555-5555-5555-5555-555555555510', 'Lait de coco', 'Epicerie', 'ml')
on conflict (id) do nothing;

insert into recette_ingredients (recette_id, ingredient_id, quantite, unite, ordre) values
  ('22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', 1, 'kg', 1),
  ('22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555502', 200, 'g', 2),
  ('22222222-2222-2222-2222-222222222202', '55555555-5555-5555-5555-555555555503', 400, 'g', 1),
  ('22222222-2222-2222-2222-222222222202', '55555555-5555-5555-5555-555555555504', 400, 'g', 2),
  ('22222222-2222-2222-2222-222222222203', '55555555-5555-5555-5555-555555555505', 200, 'g', 1),
  ('22222222-2222-2222-2222-222222222203', '55555555-5555-5555-5555-555555555506', 2, 'unite', 2),
  ('22222222-2222-2222-2222-222222222204', '55555555-5555-5555-5555-555555555507', 2, 'unite', 1),
  ('22222222-2222-2222-2222-222222222204', '55555555-5555-5555-5555-555555555508', 500, 'g', 2),
  ('22222222-2222-2222-2222-222222222205', '55555555-5555-5555-5555-555555555509', 300, 'g', 1),
  ('22222222-2222-2222-2222-222222222205', '55555555-5555-5555-5555-555555555510', 400, 'ml', 2)
on conflict (recette_id, ingredient_id) do nothing;

insert into recette_etapes (recette_id, numero, instruction) values
  ('22222222-2222-2222-2222-222222222201', 1, 'Rincer et râper grossièrement les pommes de terre.'),
  ('22222222-2222-2222-2222-222222222201', 2, 'Former des galettes et cuire au beurre 10 min de chaque côté.'),
  ('22222222-2222-2222-2222-222222222202', 1, 'Frotter le caquelon avec la gousse d''ail.'),
  ('22222222-2222-2222-2222-222222222202', 2, 'Faire fondre le fromage râpé avec le vin blanc à feu doux.'),
  ('22222222-2222-2222-2222-222222222203', 1, 'Cuire le quinoa.'),
  ('22222222-2222-2222-2222-222222222203', 2, 'Rotir les legumes 25 min au four, assembler et napper de sauce tahini.'),
  ('22222222-2222-2222-2222-222222222204', 1, 'Griller le saumon 4 min de chaque cote.'),
  ('22222222-2222-2222-2222-222222222204', 2, 'Cuire les asperges 8 min a la vapeur.'),
  ('22222222-2222-2222-2222-222222222205', 1, 'Faire revenir les epices.'),
  ('22222222-2222-2222-2222-222222222205', 2, 'Ajouter les lentilles et le lait de coco, mijoter 20 min.')
on conflict (recette_id, numero) do nothing;

-- COUR-15 : allergenes portes par les ingredients du catalogue (matrice de
-- test). Gruyère/Gruyère râpé/Vacherin -> lactose CONFIRME (fromage). Pave
-- de saumon -> poisson CONFIRME. Quinoa -> gluten POSSIBLE : risque de
-- contamination croisee reel et courant (lignes de conditionnement
-- partagees), cas volontairement ambigu pour prouver que la deduction ne le
-- traite jamais comme "sans danger". Pommes de terre/Patate douce/Asperges
-- vertes/Lentilles corail/Lait de coco : aucune ligne — illustre le cas
-- "ingredient non catalogue" (absence de donnee, pas une garantie de
-- securite, voir le commentaire sur ingredient_allergenes).
insert into ingredient_allergenes (ingredient_id, allergene_id, certitude)
select '55555555-5555-5555-5555-555555555502'::uuid, id, 'confirme' from allergenes where code = 'lactose'
union all
select '55555555-5555-5555-5555-555555555503'::uuid, id, 'confirme' from allergenes where code = 'lactose'
union all
select '55555555-5555-5555-5555-555555555504'::uuid, id, 'confirme' from allergenes where code = 'lactose'
union all
select '55555555-5555-5555-5555-555555555507'::uuid, id, 'confirme' from allergenes where code = 'poisson'
union all
select '55555555-5555-5555-5555-555555555505'::uuid, id, 'possible' from allergenes where code = 'gluten'
on conflict (ingredient_id, allergene_id) do nothing;

-- Allergenes EXPLICITEMENT declares par l'auteur (reprend les valeurs de
-- l'ancien `recettes.allergenes` seede en COUR-11/14).
insert into recette_allergenes (recette_id, allergene_id)
select '22222222-2222-2222-2222-222222222201'::uuid, id from allergenes where code in ('lactose', 'oeuf')
union all
select '22222222-2222-2222-2222-222222222202'::uuid, id from allergenes where code = 'lactose'
union all
select '22222222-2222-2222-2222-222222222204'::uuid, id from allergenes where code = 'poisson'
on conflict (recette_id, allergene_id) do nothing;
-- 203 (Buddha bowl) et 205 (Curry) : aucune declaration explicite — leur
-- seul allergene visible passera par la deduction (203 -> gluten possible,
-- via le Quinoa ; 205 -> aucun, matrice de reference pour "rien a signaler").

insert into recette_regimes (recette_id, regime_id)
select '22222222-2222-2222-2222-222222222201'::uuid, id from regimes where code in ('vegetarien', 'sans_noix')
union all
select '22222222-2222-2222-2222-222222222202'::uuid, id from regimes where code in ('vegetarien', 'sans_noix')
union all
select '22222222-2222-2222-2222-222222222203'::uuid, id from regimes where code in ('vegan', 'vegetarien', 'sans_gluten', 'sans_noix')
union all
select '22222222-2222-2222-2222-222222222204'::uuid, id from regimes where code in ('sans_gluten', 'sans_lactose', 'sans_noix', 'poisson')
union all
select '22222222-2222-2222-2222-222222222205'::uuid, id from regimes where code in ('vegan', 'vegetarien', 'sans_gluten', 'sans_noix')
on conflict (recette_id, regime_id) do nothing;

-- COUR-11 : planning de la semaine + liste de courses associee, pour couvrir
-- les 4 parcours minimaux demandes par le ticket (utilisateur, foyer,
-- planning, liste de courses). Semaine fixe (pas "la semaine courante") pour
-- rester deterministe et reexecutable a l'identique a chaque reset.
--
-- Note : l'app ne lit/n'ecrit pas planning_repas aujourd'hui (le planning
-- vit dans stores/planningStore.ts, cote client uniquement — voir
-- SCHEMA_INVENTORY.md §"tables orphelines"). Le jsonb ci-dessous reference
-- les recettes par id plutot que de les embarquer completement : plus sain
-- pour une table encore sans lecteur/ecrivain reel, a adapter le jour ou
-- le planning sera persiste cote serveur.
insert into planning_repas (id, profil_id, semaine_debut, repas) values (
  '33333333-3333-3333-3333-333333333301',
  '11111111-1111-1111-1111-111111111111',
  '2026-01-05',
  '{
    "lundi": {"midi": {"recette_id": "22222222-2222-2222-2222-222222222201"}},
    "mardi": {"soir": {"recette_id": "22222222-2222-2222-2222-222222222203"}},
    "mercredi": {"midiIgnore": true},
    "jeudi": {"midi": {"recette_id": "22222222-2222-2222-2222-222222222204", "portions": 2}},
    "vendredi": {},
    "samedi": {"soir": {"recette_id": "22222222-2222-2222-2222-222222222202"}},
    "dimanche": {}
  }'::jsonb
) on conflict (id) do nothing;

-- Liste de courses generee a partir du planning ci-dessus (items denormalises,
-- comme le fait reellement lib/generateurCourses.ts cote client).
insert into listes_courses (id, profil_id, planning_id, items) values (
  '44444444-4444-4444-4444-444444444401',
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333301',
  '[
    {"id":"item-1","produit":"Pommes de terre","quantite":1,"unite":"kg","rayon":"Fruits & Legumes","coche":false,"recette_origine":"22222222-2222-2222-2222-222222222201"},
    {"id":"item-2","produit":"Gruyère râpé","quantite":200,"unite":"g","rayon":"Produits laitiers","coche":false,"recette_origine":"22222222-2222-2222-2222-222222222201"},
    {"id":"item-3","produit":"Quinoa","quantite":200,"unite":"g","rayon":"Epicerie","coche":true,"recette_origine":"22222222-2222-2222-2222-222222222203"},
    {"id":"item-4","produit":"Papier toilette","quantite":1,"unite":"paquet","rayon":"Hygiene","coche":false}
  ]'::jsonb
) on conflict (id) do nothing;

-- COUR-16 : produit canonique "Riz basmati" (repris de lib/mocks/prix.mock.ts)
-- suivi chez 2 enseignes, 3 offres (2 formats chez Migros pour tester la
-- comparaison de formats demandee par la Verification du ticket), et un
-- historique de prix avec plusieurs observations dans le temps pour l'offre
-- Migros 1kg (pour tester "retrouver le prix courant ainsi que
-- l'historique" — le courant est simplement le plus recent).
insert into produits_canoniques (id, nom, rayon) values
  ('77777777-7777-7777-7777-777777777701', 'Riz basmati', 'Epicerie')
on conflict (id) do nothing;

insert into offres_magasin (id, produit_canonique_id, enseigne_id, format, quantite, unite)
select '88888888-8888-8888-8888-888888888801'::uuid, '77777777-7777-7777-7777-777777777701'::uuid, id, '1kg', 1, 'kg'
from enseignes where code = 'migros'
union all
select '88888888-8888-8888-8888-888888888802'::uuid, '77777777-7777-7777-7777-777777777701'::uuid, id, '500g', 0.5, 'kg'
from enseignes where code = 'migros'
union all
select '88888888-8888-8888-8888-888888888803'::uuid, '77777777-7777-7777-7777-777777777701'::uuid, id, '1kg', 1, 'kg'
from enseignes where code = 'coop'
on conflict (id) do nothing;

-- Migros 1kg : 2 observations dans le temps (prix a baisse de 4.50 a 4.20/kg)
-- -> le "prix courant" (vue prix_courant) doit retourner 4.20, pas 4.50.
insert into prix_historique (id, offre_id, prix, prix_unitaire, promotion, source, collecte_le) values
  ('99999999-9999-9999-9999-999999999901', '88888888-8888-8888-8888-888888888801', 4.50, 4.50, null, 'saisie_manuelle', '2026-07-01 08:00:00+00'),
  ('99999999-9999-9999-9999-999999999902', '88888888-8888-8888-8888-888888888801', 4.20, 4.20, '-7%', 'saisie_manuelle', '2026-07-20 08:00:00+00'),
  -- Migros 500g : prix unitaire plus eleve que le 1kg (petit format plus
  -- cher au kilo, cas realiste) -> matrice de comparaison de formats.
  ('99999999-9999-9999-9999-999999999903', '88888888-8888-8888-8888-888888888802', 2.30, 4.60, null, 'saisie_manuelle', '2026-07-20 08:00:00+00'),
  ('99999999-9999-9999-9999-999999999904', '88888888-8888-8888-8888-888888888803', 4.35, 4.35, null, 'saisie_manuelle', '2026-07-20 08:00:00+00')
on conflict (id) do nothing;
