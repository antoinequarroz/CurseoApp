# COUR-91 — Résolution automatique des produits

## Objectif

Préparer les paniers des enseignes sans demander à la personne de choisir ou
de confirmer chaque référence produit. La validation humaine porte sur le
panier final.

## Règles

- le planificateur relance automatiquement une recherche catalogue pour chaque
  article initialement non trouvé, par lots de quatre ;
- le meilleur résultat est choisi selon la correspondance, les marques
  préférées/refusées et le prix ;
- une variante contradictoire n'est jamais sélectionnée automatiquement ;
- une option « une seule enseigne » reste dans cette enseigne ;
- un article sans équivalent fiable est marqué « indisponible en ligne » et
  n'est pas présenté comme un choix manuel à effectuer ;
- les correspondances prudentes sont informatives, mais ne déclenchent plus une
  confirmation produit par produit ;
- les quantités insuffisantes restent bloquantes avant le checkout.

## Hors périmètre

Le prototype ne transmet encore aucun panier réel à Migros ou Coop. Les prix et
disponibilités restent indicatifs jusqu'aux futures API officielles.

## Vérification

- tests du repository : relance, sélection automatique, maintien des
  indisponibles et conservation d'une option mono-enseigne ;
- tests du panier : absence des actions « Changer » et « Confirmer ce produit » ;
- tests de réconciliation : seule une incohérence de quantité bloque le checkout ;
- contrôle manuel sur petit iPhone et grand Android avant la prochaine release.
