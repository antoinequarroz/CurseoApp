# COUR-60 — Canary et qualité des prix live

## Story

En tant qu'équipe CoursIA, nous voulons mesurer la couverture, la validité et
la proximité avec des prix observés avant toute activation utilisateur afin de
ne pas transformer une démonstration technique en promesse commerciale
incorrecte.

## Critères d'acceptation

- le canary distant est exclusivement manuel et exige l'accord de licence ;
- cinq recherches synthétiques ciblent uniquement Migros et Coop ;
- aucune liste, préférence ou recherche utilisateur n'est utilisée ;
- aucune réponse brute, aucun nom de produit et aucun prix ne sont conservés
  dans l'artefact GitHub ;
- le gateway retire les résultats à prix nul/invalide et le champ fournisseur
  `raw` avant toute réponse à Supabase ;
- le rapport contient seulement les taux de succès, couverture enseigne,
  validité du schéma, prix CHF positifs, comparabilité unitaire et latence p95 ;
- le gate technique exige 100 % de requêtes réussies, 70 % de couverture
  enseigne, 100 % de schémas et prix valides, 40 % de prix comparables et une
  latence p95 au plus égale à 10 secondes ;
- un benchmark séparé exige au moins dix observations terrain de moins de
  24 heures, un écart médian au plus égal à 5 % et un p90 au plus égal à 10 % ;
- le rapport du benchmark ne recopie aucune référence de produit ;
- le canary ne peut modifier ni le secret serveur ni le flag mobile ;
- réussir le canary ne suffit pas à activer le service : une décision humaine
  et le benchmark terrain restent requis.

## Hors périmètre

- activation du serveur, de TestFlight ou de la production ;
- garantie de stock ou de prix en magasin ;
- conservation d'un historique détaillé de produits ;
- extension à Aldi, Lidl ou Otto's ;
- automatisation d'une décision commerciale.
