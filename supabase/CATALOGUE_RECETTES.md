# Premier catalogue réel de recettes (COUR-18)

## Volume minimum de lancement

**15 recettes publiées**, décidé pour ce ticket et documenté ici — distinct
de la cible business de 500 recettes (suivie séparément, hors scope de ce
ticket). Justification du chiffre :
- Suffisant pour que le swipe/planning (`app/(tabs)/planifier.tsx`) ne
  boucle pas de façon perceptible sur une session normale (planifier une
  semaine = 7-14 repas).
- Couvre les 7 régimes du référentiel (COUR-15) et 6 des 14 allergènes,
  assez de diversité pour valider le filtrage régime/allergies en
  conditions réelles plutôt que sur un jeu de test synthétique.
- Volume atteignable manuellement via le pipeline CSV (COUR-17) sans
  automatisation — cohérent avec l'objectif du ticket ("mettre à
  disposition un corpus initial exploitable", pas encore le catalogue
  cible).

## Source et droits

Recettes originales écrites pour Coursia (pas de scraping, pas de contenu
tiers sous droit d'auteur) — chaque ligne du CSV porte
`source = "Coursia (recette originale) — photo Unsplash sous licence
libre, aucune attribution requise"`. Base légale : les photos utilisées
(URLs `images.unsplash.com`) sont sous licence Unsplash, qui autorise
l'usage commercial et ne requiert aucune attribution ni permission —
vérifié avant l'import, pas supposé.

## Corpus et exclusions

Repris de `lib/mocks/recettes.mock.ts` (20 recettes "officielles" + 4
communautaires) :
- **15 recettes retenues** → `scripts/catalogue-initial.csv`, générées via
  `scripts/generate-catalogue-initial-csv.mjs` (conversion automatique
  depuis le mock, pas de transcription manuelle — évite les erreurs de
  copie).
- **5 exclues** (r-001, r-002, r-006, r-007, r-012) : déjà présentes dans
  `supabase/seed.sql` (COUR-11/14) avec des ids fixes pour les besoins de
  démo/dev local — les réimporter sous une autre `cle_externe` aurait créé
  des **doublons de titre** en local. Pas de conflit en production
  (`seed.sql` n'y tourne jamais).
- **4 recettes communautaires exclues** (rc-*) : contenu pensé comme
  soumis par les utilisateurs, pas comme faisant partie du catalogue
  "officiel" initial.
- **Recettes incomplètes** : structurellement impossible d'en importer —
  `fn_importer_recettes_csv` (COUR-17) rejette tout le fichier si une seule
  ligne manque d'ingrédients, d'étapes, ou référence un ingrédient/régime/
  allergène inconnu du référentiel.

### Anomalie trouvée et corrigée pendant la préparation

`lib/mocks/recettes.mock.ts` avait `allergenes: ['fruits a coque']` (r-017,
espaces) au lieu du code canonique `fruits_a_coque` (COUR-15) — détecté par
le rejet du dry-run (`allergene inconnu du référentiel`), pas découvert
après coup. Corrigé à la source plutôt que contourné dans le pipeline.

## Contrôle manuel de l'échantillon

Fait sur les 15 recettes (échantillon = l'intégralité du lot, pas un
sous-ensemble, vu le faible volume) : titre, portions, source,
`statut_publication='publiee'`, nombre d'ingrédients (4-5) et d'étapes
(3-4) par recette vérifiés en base après import. Deux recettes vérifiées
en détail ligne par ligne (ingrédients avec quantité/unité dans l'ordre,
texte des étapes) : *Poulet au curry et riz basmati* (le cas le plus
complexe, 5 ingrédients) et *Pizza margherita maison*. Aucun doublon de
titre, aucune recette sans ingrédient ni étape sur l'ensemble de la table
`recettes` (requête de contrôle, résultat vide sur les deux).

## Import — idempotence vérifiée

```bash
node scripts/import-recettes-csv.mjs scripts/catalogue-initial.csv --dry-run
node scripts/import-recettes-csv.mjs scripts/catalogue-initial.csv
```

Réimporté une seconde fois pendant la vérification : `a_creer: 0,
a_mettre_a_jour: 15` — aucun doublon créé, cohérent avec le comportement
garanti par COUR-17.

## Visibilité dans l'application

`hooks/useRecettes.ts` (consommé par l'onglet Recettes de
`app/(tabs)/planifier.tsx`) lit désormais les recettes réelles publiées via
`lib/recettesRepository.ts` (`statut_publication = 'publiee'`) quand
Supabase est configuré et que le catalogue distant n'est pas vide — repli
sur `RECETTES_MOCK` sinon (dev sans backend, ou catalogue momentanément
vide). Les autres écrans qui référencent encore `RECETTES_MOCK`
directement (onglet Communauté, sondage de goûts) restent sur les mocks —
hors du périmètre "catalogue de recettes" de ce ticket.
