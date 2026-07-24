-- COUR-18 (correctif) : les 10 ingredients "de demo" de COUR-14 n'ont
-- jamais existe qu'en local, via supabase/seed.sql (qui ne tourne jamais
-- en production) -- jamais versionnes dans une migration. Invisible
-- jusqu'a l'import reel du catalogue en production, qui a echoue sur
-- "Quinoa"/"Pommes de terre" inconnus du catalogue (2 des 15 recettes du
-- corpus COUR-18 les utilisent). Meme categorie de piege que le grant
-- service_role de COUR-10 : un seed local masque un manque reel cote
-- production. Ajoute les 10 ici pour de bon, pas seulement les 2 qui
-- bloquaient dans l'immediat.
insert into ingredients (nom, rayon, unite_defaut) values
  ('Pommes de terre', 'Fruits & Legumes', 'kg'),
  ('Gruyère râpé', 'Produits laitiers', 'g'),
  ('Gruyère', 'Produits laitiers', 'g'),
  ('Vacherin fribourgeois', 'Produits laitiers', 'g'),
  ('Quinoa', 'Epicerie', 'g'),
  ('Patate douce', 'Fruits & Legumes', 'unite'),
  ('Pave de saumon', 'Viandes', 'unite'),
  ('Asperges vertes', 'Fruits & Legumes', 'g'),
  ('Lentilles corail', 'Epicerie', 'g')
on conflict (nom) do nothing;
