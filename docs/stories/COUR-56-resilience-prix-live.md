# COUR-56 — Résilience et transparence des prix live

## Story

En tant qu'utilisateur CoursIA, je veux savoir d'où viennent les prix et quand
ils ont été relevés, tout en conservant ma liste et les données disponibles si
le service live ne répond plus.

## Critères d'acceptation

- chaque optimisation affiche sa source et son heure de collecte en heure
  suisse ;
- un nouvel appel invalide proprement le résultat si la liste ou le mode a
  changé ;
- une panne ne supprime jamais la liste de courses ;
- si une actualisation échoue après un succès, le résultat précédent reste
  affiché avec un avertissement et son horodatage ;
- pour un produit déjà connu du catalogue Supabase, une panne du live revient
  aux données du catalogue, même si celui-ci ne contient encore aucun prix ;
- pour un produit inconnu du catalogue, une panne live reste une erreur
  explicite et n'est pas présentée comme « produit non suivi » ;
- aucun prix fictif n'est utilisé comme repli lorsque Supabase est configuré ;
- les erreurs sont annoncées aux technologies d'assistance et permettent une
  nouvelle tentative ;
- la source et l'heure sont fixées par l'Edge Function, pas par le gateway ni
  par une valeur fournie par le mobile.

## Hors périmètre

- persistance locale d'une optimisation entre deux lancements ;
- activation production ou TestFlight du feature flag ;
- garantie de stock ou de prix en magasin.
