-- COUR-10/COUR-11 : donnees de seed minimales et anonymes pour developper et
-- tester sans copier de donnees personnelles de production. Execute
-- automatiquement par `supabase db reset`. Deterministe et reexecutable a
-- l'identique (dates fixes, ids fixes, `on conflict do nothing`) : jamais de
-- donnee reelle, jamais de `now()`/valeur aleatoire dans les donnees seedees
-- elles-memes. Couvre les 4 parcours minimaux du ticket : un utilisateur
-- fictif, un foyer (profil), un planning, une liste de courses.

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
-- filtrage regime/allergies cote base (idx_recettes_regime/allergenes)
-- plutot que le mock client.
insert into recettes (
  id, titre, description, image_url, blurhash, temps_preparation, difficulte,
  cout_estime, calories, portions, regime, allergenes, ingredients, etapes,
  est_communautaire
) values
  (
    '22222222-2222-2222-2222-222222222201',
    'Rösti au fromage et oeuf au plat',
    'Le classique suisse : röstis dorés, fromage fondant et oeuf au plat.',
    'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5',
    'L6Pj0^jE.AyE_3t7t7R**0o#DgR4', 35, 'moyen', 12.5, 620, 4,
    array['vegetarien', 'sans_noix']::text[], array['lactose', 'oeuf']::text[],
    '[{"nom":"Pommes de terre","quantite":1,"unite":"kg","rayon":"Fruits & Legumes"},{"nom":"Gruyère râpé","quantite":200,"unite":"g","rayon":"Produits laitiers"}]'::jsonb,
    array['Rincer et râper grossièrement les pommes de terre.', 'Former des galettes et cuire au beurre 10 min de chaque côté.']::text[],
    false
  ),
  (
    '22222222-2222-2222-2222-222222222202',
    'Fondue moitié-moitié',
    'Fondue traditionnelle gruyère-vacherin, pain de campagne.',
    'https://images.unsplash.com/photo-1573821663912-6df460f9c684',
    'L5Q9_@of00WB~qofofof9Faz%2ay', 25, 'facile', 22, 780, 4,
    array['vegetarien', 'sans_noix']::text[], array['lactose']::text[],
    '[{"nom":"Gruyère","quantite":400,"unite":"g","rayon":"Produits laitiers"},{"nom":"Vacherin fribourgeois","quantite":400,"unite":"g","rayon":"Produits laitiers"}]'::jsonb,
    array['Frotter le caquelon avec la gousse d''ail.', 'Faire fondre le fromage râpé avec le vin blanc à feu doux.']::text[],
    false
  ),
  (
    '22222222-2222-2222-2222-222222222203',
    'Buddha bowl vegan',
    'Bowl complet quinoa, legumes rotis et sauce tahini.',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd',
    'L6Pj0^jE.AyE_3t7t7R**0o#DgR4', 30, 'facile', 14, 480, 2,
    array['vegan', 'vegetarien', 'sans_gluten', 'sans_noix']::text[], array[]::text[],
    '[{"nom":"Quinoa","quantite":200,"unite":"g","rayon":"Epicerie"},{"nom":"Patate douce","quantite":2,"unite":"unite","rayon":"Fruits & Legumes"}]'::jsonb,
    array['Cuire le quinoa.', 'Rotir les legumes 25 min au four.', 'Assembler et napper de sauce tahini.']::text[],
    false
  ),
  (
    '22222222-2222-2222-2222-222222222204',
    'Saumon grillé, asperges vertes',
    'Pave de saumon grille, asperges vertes vapeur, citron.',
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288',
    'L6Pj0^jE.AyE_3t7t7R**0o#DgR4', 20, 'facile', 18, 410, 2,
    array['sans_gluten', 'sans_lactose', 'sans_noix', 'poisson']::text[], array['poisson']::text[],
    '[{"nom":"Pave de saumon","quantite":2,"unite":"unite","rayon":"Viandes"},{"nom":"Asperges vertes","quantite":500,"unite":"g","rayon":"Fruits & Legumes"}]'::jsonb,
    array['Griller le saumon 4 min de chaque cote.', 'Cuire les asperges 8 min a la vapeur.']::text[],
    false
  ),
  (
    '22222222-2222-2222-2222-222222222205',
    'Curry de lentilles corail',
    'Curry de lentilles corail au lait de coco, riz basmati.',
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe',
    'L6Pj0^jE.AyE_3t7t7R**0o#DgR4', 30, 'facile', 9, 520, 4,
    array['vegan', 'vegetarien', 'sans_gluten', 'sans_noix']::text[], array[]::text[],
    '[{"nom":"Lentilles corail","quantite":300,"unite":"g","rayon":"Epicerie"},{"nom":"Lait de coco","quantite":400,"unite":"ml","rayon":"Epicerie"}]'::jsonb,
    array['Faire revenir les epices.', 'Ajouter les lentilles et le lait de coco, mijoter 20 min.']::text[],
    false
  )
on conflict (id) do nothing;

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
