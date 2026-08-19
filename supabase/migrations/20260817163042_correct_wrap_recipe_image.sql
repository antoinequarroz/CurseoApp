-- COUR-63 : le visuel precedent montrait du pain perdu alors que la recette
-- est un wrap vegetal. `cle_externe` est stable entre les imports CSV et la
-- production; l'UPDATE reste sans effet lors d'un reset local minimal, ou le
-- catalogue complet n'est volontairement pas seedé.
update public.recettes
set
  image_url = 'https://images.pexels.com/photos/17321469/pexels-photo-17321469.jpeg',
  source = 'coursIA (recette originale) — photo Pexels / Shameel mukkath',
  updated_at = now()
where cle_externe = 'catalogue-v1-r-043';
