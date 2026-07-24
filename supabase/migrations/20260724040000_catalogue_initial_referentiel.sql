-- COUR-18 : premier catalogue reel de recettes. `botte` (ex. botte de
-- basilic/poireaux) manquait au referentiel `unites_mesure` (COUR-14) —
-- decouvert en construisant le corpus reel, pas anticipe a l'origine.
insert into unites_mesure (code, libelle) values
  ('botte', 'Botte')
on conflict (code) do nothing;

-- Ingredients requis par le corpus de 15 recettes de ce ticket (voir
-- supabase/CATALOGUE_RECETTES.md), absents du catalogue COUR-14 (qui n'en
-- avait que 10, pour les 5 recettes de demo seedees). `nom` doit
-- correspondre exactement (insensible a la casse) aux noms utilises dans
-- scripts/fixtures/catalogue-initial.csv, sinon fn_importer_recettes_csv
-- rejette l'import (ingredient inconnu du catalogue).
insert into ingredients (nom, rayon, unite_defaut) values
  ('Ail', 'Fruits & Legumes', 'unite'),
  ('Ananas frais', 'Fruits & Legumes', 'unite'),
  ('Avocat', 'Fruits & Legumes', 'unite'),
  ('Banane', 'Fruits & Legumes', 'unite'),
  ('Basilic frais', 'Fruits & Legumes', 'botte'),
  ('Blanc de poulet', 'Viandes', 'g'),
  ('Boeuf haché', 'Viandes', 'g'),
  ('Boeuf à braiser', 'Viandes', 'kg'),
  ('Bouillon de légumes', 'Epicerie', 'l'),
  ('Cannelle', 'Epicerie', 'cc'),
  ('Carottes', 'Fruits & Legumes', 'g'),
  ('Champignons de Paris', 'Fruits & Legumes', 'g'),
  ('Chapelure', 'Epicerie', 'g'),
  ('Concombre', 'Fruits & Legumes', 'unite'),
  ('Courgette', 'Fruits & Legumes', 'unite'),
  ('Crème entière', 'Produits laitiers', 'ml'),
  ('Edamame', 'Surgeles', 'g'),
  ('Escalope de veau', 'Viandes', 'unite'),
  ('Farine', 'Epicerie', 'g'),
  ('Feta', 'Produits laitiers', 'g'),
  ('Filet de porc', 'Viandes', 'g'),
  ('Fruits rouges surgelés', 'Surgeles', 'g'),
  ('Granola', 'Epicerie', 'g'),
  ('Guanciale', 'Viandes', 'g'),
  ('Halloumi', 'Produits laitiers', 'g'),
  ('Houmous', 'Epicerie', 'g'),
  ('Lait de coco', 'Epicerie', 'ml'),
  ('Lardons', 'Viandes', 'g'),
  ('Mangue', 'Fruits & Legumes', 'unite'),
  ('Mozzarella', 'Produits laitiers', 'g'),
  ('Muscade', 'Epicerie', 'pincee'),
  ('Oeufs', 'Produits laitiers', 'unite'),
  ('Oignon', 'Fruits & Legumes', 'unite'),
  ('Parmesan', 'Produits laitiers', 'g'),
  ('Pecorino', 'Produits laitiers', 'g'),
  ('Poireau', 'Fruits & Legumes', 'unite'),
  ('Poivron rouge', 'Fruits & Legumes', 'unite'),
  ('Poivron', 'Fruits & Legumes', 'unite'),
  ('Pommes du Valais', 'Fruits & Legumes', 'kg'),
  ('Potiron', 'Fruits & Legumes', 'g'),
  ('Pâte brisée', 'Epicerie', 'unite'),
  ('Pâte de curry', 'Epicerie', 'cs'),
  ('Riz arborio', 'Epicerie', 'g'),
  ('Riz basmati', 'Epicerie', 'g'),
  ('Riz sushi', 'Epicerie', 'g'),
  ('Sauce soja', 'Epicerie', 'cs'),
  ('Sauce tomate', 'Conserves', 'g'),
  ('Spaghetti', 'Epicerie', 'g'),
  ('Sucre', 'Epicerie', 'g'),
  ('Thon frais', 'Viandes', 'g'),
  ('Tomates pelées', 'Conserves', 'g'),
  ('Tomate', 'Fruits & Legumes', 'unite'),
  ('Tortillas', 'Epicerie', 'unite'),
  ('Vin rouge', 'Boissons', 'ml'),
  ('Yogourt nature', 'Produits laitiers', 'g')
on conflict (nom) do nothing;
