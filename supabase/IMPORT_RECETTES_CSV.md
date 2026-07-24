# Import CSV de recettes — format v1 (COUR-17)

Pipeline controle pour alimenter le catalogue de recettes manuellement,
avant que ce soit automatise. Deux fichiers :
- `scripts/import-recettes-csv.mjs` — parsing/typage du CSV, appel a la
  fonction SQL, rapport d'erreurs.
- `fn_importer_recettes_csv` (migration `20260724030000`) — validation
  referentielle/metier et ecriture atomique.

## Format du fichier (v1)

CSV standard (`,` separateur de colonnes, `"` pour echapper une valeur
contenant une virgule, `""` pour un guillemet litteral). En-tete obligatoire
avec exactement ces colonnes, dans n'importe quel ordre :

| Colonne | Obligatoire | Format |
|---|---|---|
| `cle_externe` | oui | texte, unique dans le fichier ET dans la base — c'est la cle d'idempotence (voir §Idempotence) |
| `titre` | oui | texte |
| `description` | non | texte |
| `image_url` | non | URL |
| `temps_preparation` | non | entier (minutes) |
| `difficulte` | non | `facile` \| `moyen` \| `difficile` |
| `cout_estime` | non | decimal |
| `calories` | non | entier |
| `proteines_g` / `glucides_g` / `lipides_g` | non | decimal |
| `portions` | oui | entier > 0 |
| `source` | non | texte libre (ex. `csv`, URL) |
| `statut_publication` | non | `brouillon` \| `publiee` \| `archivee` (defaut `brouillon`) |
| `regimes` | non | codes du referentiel `regimes` (COUR-15), separes par `\|` — ex. `vegetarien\|sans_gluten` |
| `allergenes` | non | codes du referentiel `allergenes` (COUR-15), separes par `\|` |
| `ingredients` | oui | au moins 1, format `nom:quantite:unite` separes par `;` — ex. `Quinoa:200:g;Patate douce:1:unite` |
| `etapes` | oui | au moins 1, instructions separees par `;`, dans l'ordre |

Voir `scripts/fixtures/recettes-valides.csv` pour un exemple complet.

### Références qui doivent déjà exister

- Chaque **nom d'ingredient** doit correspondre (insensible a la casse) a un
  ingredient deja present dans la table `ingredients` (COUR-14). Le pipeline
  ne cree jamais un ingredient automatiquement — un nom inconnu est une
  erreur, pas une creation silencieuse.
- Chaque **unite** d'ingredient doit exister dans `unites_mesure`.
- Chaque code de `regimes`/`allergenes` doit exister dans les referentiels
  correspondants (COUR-15).

## Utilisation

```bash
# Previsualiser sans rien ecrire
SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=<cle> \
  node scripts/import-recettes-csv.mjs mon_fichier.csv --dry-run

# Importer pour de vrai
SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=<cle> \
  node scripts/import-recettes-csv.mjs mon_fichier.csv
```

`SUPABASE_URL` est optionnel (defaut : `http://127.0.0.1:54321`, l'instance
locale). `SUPABASE_SERVICE_ROLE_KEY` est obligatoire — c'est un outil
d'operateur controle : la fonction SQL n'est accessible qu'a `service_role`,
jamais a `anon`/`authenticated` (voir la migration).

## Validation — jamais d'import partiel silencieux

Toutes les lignes du fichier sont validees AVANT toute ecriture :
- **Champs** : obligatoires presents, types corrects (`portions` entier > 0,
  `difficulte`/`statut_publication` dans l'enum attendu).
- **Unites** : chaque unite d'ingredient doit exister dans `unites_mesure`.
- **Doublons** : `cle_externe` ne peut pas apparaitre deux fois dans le
  meme fichier.
- **References** : ingredients/regimes/allergenes doivent deja exister dans
  leurs referentiels respectifs.

S'il y a **ne serait-ce qu'une seule erreur** sur tout le fichier, **aucune**
ligne n'est importee (pas d'import partiel) — le rapport liste toutes les
erreurs trouvees, avec le numero de ligne exact du fichier, pour corriger le
fichier en un seul passage plutot que de decouvrir les erreurs une par une.

## Dry-run

`--dry-run` execute exactement la meme validation et calcule le meme
apercu (`a_creer`/`a_mettre_a_jour`) que l'import reel, mais n'ecrit jamais
rien en base — meme si le fichier est parfaitement valide.

## Idempotence

L'import repose sur `cle_externe` (colonne ajoutee a `recettes` par cette
migration, unique, nullable — les recettes creees via l'app n'en ont pas
besoin). Rejouer exactement le meme fichier :
- si une recette avec cette `cle_externe` existe deja : ses champs sont mis
  a jour (upsert), et TOUTES ses lignes filles (ingredients/etapes/
  regimes/allergenes) sont remplacees par celles du fichier — pas
  cumulees, pas dupliquees.
- sinon : creation normale.

Consequence pratique : reimporter le meme fichier plusieurs fois de suite
produit exactement le meme etat final, jamais de doublons.

## Vérification (ce ticket)

`scripts/verify-import-csv.sh` — importe `scripts/fixtures/recettes-valides.csv`
deux fois de suite (verifie `a_creer=2` puis `a_creer=0, a_mettre_a_jour=2`,
et que le nombre total de recettes ne bouge pas entre les deux), puis importe
`scripts/fixtures/recettes-avec-erreurs.csv` (verifie que le script sort en
erreur et qu'aucune recette n'est ajoutee). Execute manuellement et dans la
CI (job `supabase-migrations`).
