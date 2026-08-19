-- COUR-66 : reprise de la partie CoursIA d'une migration mixte appliquee par
-- le back-office. Les index visant ses tables privees restent sous sa
-- responsabilite ; les index ci-dessous rendent le schema mobile rejouable.

create index if not exists commandes_liste_id_idx
  on public.commandes(liste_id);

create index if not exists favoris_recette_id_idx
  on public.favoris(recette_id);

create index if not exists ingredients_unite_defaut_idx
  on public.ingredients(unite_defaut);

create index if not exists offres_magasin_unite_idx
  on public.offres_magasin(unite);

create index if not exists produits_canoniques_ingredient_id_idx
  on public.produits_canoniques(ingredient_id);

create index if not exists recette_ingredients_ingredient_id_idx
  on public.recette_ingredients(ingredient_id);

create index if not exists recette_ingredients_unite_idx
  on public.recette_ingredients(unite);

create index if not exists recettes_auteur_id_idx
  on public.recettes(auteur_id);

create index if not exists signalements_moderateur_id_idx
  on public.signalements(moderateur_id);

create index if not exists signalements_signale_par_idx
  on public.signalements(signale_par);

create index if not exists synonymes_allergenes_allergene_id_idx
  on public.synonymes_allergenes(allergene_id);
