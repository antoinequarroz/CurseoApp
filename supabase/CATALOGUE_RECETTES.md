# Catalogue de recettes V1 (COUR-18 / COUR-47)

## Volume du prototype

Le catalogue V1 contient **50 recettes publiées** :

- 15 recettes historiques dans `scripts/catalogue-initial.csv` ;
- 35 recettes complémentaires dans `scripts/catalogue-v1-extension.csv`.

Ce volume permet de tester plusieurs semaines de planning sans présenter la
cible business de 500 recettes comme déjà atteinte. L'extension est séparée du
lot initial afin de préserver la traçabilité et de pouvoir contrôler ou
réimporter chaque lot indépendamment.

## Périmètre éditorial

Les 35 nouvelles recettes couvrent les usages principaux du prototype : repas
rapides, plats familiaux, végétarien, vegan, poisson et petit-déjeuner. Chaque
recette possède quatre ingrédients connus du référentiel, trois étapes, un
nombre de portions, un temps, une difficulté et une estimation indicative du
coût et des calories.

Les champs nutritionnels détaillés restent vides : aucune valeur de protéines,
glucides ou lipides n'est publiée sans source nutritionnelle vérifiable. Les
coûts sont des estimations éditoriales et ne doivent pas être confondus avec les
prix réels du comparateur.

## Sources, images et droits

Les textes sont des recettes originales écrites pour coursIA, sans scraping ni
copie de contenu éditorial tiers. Les images distantes utilisent des URLs
Unsplash et sont identifiées dans le champ `source`. Plusieurs recettes
partagent temporairement une image de catégorie ; une passe d'illustrations
uniques est prévue avant la communication publique du catalogue.

Avant une sortie store publique, les URLs d'images devront être figées et leur
licence archivée dans le registre de contenus du projet. Le lot actuel convient
au prototype TestFlight mais ne remplace pas cet audit éditorial final.

## Garanties de l'import

Le script `scripts/import-recettes-csv.mjs` appelle
`fn_importer_recettes_csv` :

- validation atomique de tout le fichier avant écriture ;
- rejet des ingrédients, régimes, allergènes ou unités inconnus ;
- rejet d'une recette sans ingrédient ou sans étape ;
- upsert idempotent par `cle_externe` ;
- accès réservé à `service_role`.

Les 35 nouvelles recettes utilisent exclusivement les ingrédients déjà présents
dans le référentiel. COUR-47 n'ajoute donc ni migration, ni table, ni policy RLS.

## Commandes opérateur

```bash
node scripts/import-recettes-csv.mjs scripts/catalogue-initial.csv --dry-run
node scripts/import-recettes-csv.mjs scripts/catalogue-v1-extension.csv --dry-run

node scripts/import-recettes-csv.mjs scripts/catalogue-initial.csv
node scripts/import-recettes-csv.mjs scripts/catalogue-v1-extension.csv
```

`scripts/verify-catalogue.sh` importe les deux lots sur la base Supabase locale,
vérifie au moins 50 recettes publiées et 200 lignes d'ingrédients, puis réimporte
les deux lots pour prouver que le volume reste stable.

## Visibilité dans l'application

`hooks/useRecettes.ts` charge les recettes publiées via
`lib/recettesRepository.ts` lorsque Supabase est configuré. Le mock reste un
repli de développement si le backend est indisponible ou vide. Les nouvelles
recettes deviennent donc visibles sans nouvelle version de l'application après
un import réussi.
