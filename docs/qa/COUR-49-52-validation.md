# Validation COUR-49 à COUR-52 — 10 août 2026

## Automatisation

- TypeScript : `npm run type-check` — OK.
- ESLint : `npm run lint` — OK, zéro avertissement.
- Jest avec couverture : 39 suites, 231 tests — OK.
- Tests ciblés finaux : 4 suites, 17 tests — OK.
- Expo Doctor : 20/20 contrôles — OK.
- Export de production iOS et Android — OK.
- Catalogue : 50 recettes, 50 visuels uniques — OK.

Les avertissements React `act(...)` et la fermeture forcée d'un worker Jest
étaient déjà présents dans la suite; ils ne font échouer ni les tests ni les
seuils de couverture. Le test de synchronisation ajouté est encapsulé dans
`act` lors de sa dernière passe ciblée.

## Backend

- `supabase db reset` complet : toutes les migrations de `20260714000000` à
  `20260809123024` ont été rejouées, puis le seed appliqué.
- `verify-catalogue.sh` : 55 recettes locales publiées (dont 50 catalogue),
  211 lignes d'ingrédients, complétude 4 ingrédients/3 étapes et réimport
  idempotent confirmés; import anonyme refusé en HTTP 401.
- `verify-repas-planifies.sh` : deux comptes GoTrue réels, trois semaines sans
  collision, contraintes métier actives, isolation RLS entre comptes et accès
  anonyme vide.
- Production : les 35 recettes COUR-47 ont été mises à jour après un dry-run;
  contrôle final à 50 recettes catalogue/50 visuels uniques, RPC d'import
  anonyme refusée en HTTP 401.
- Aucune migration ni Edge Function n'est ajoutée par COUR-49 à COUR-52.

## Appareils et diffusion

- Android : AVD Pixel 5 API 33 créé et démarré en 1080×2340. La
  compilation native Expo/Gradle n'a toutefois pas produit d'APK dans cet
  environnement Windows : elle est restée bloquée lors du téléchargement et
  de la transformation d'artefacts Gradle. Le test UI Android et l'exécution
  Maestro n'ont donc pas été présentés comme réussis.
- iOS : les bundles sont validés sous Windows, qui ne peut pas exécuter de
  simulateur iOS. Le flow Maestro et la matrice petit/grand iPhone sont prêts
  pour un runner macOS ou Maestro Cloud.
- TestFlight : build `1.0.0 (15)` terminée avec succès via EAS
  (`8e4486f2-f4cf-4b78-9b14-9d37d1328874`), puis soumission App Store Connect
  terminée sans erreur (`7bed0844-caa1-405a-968e-d0518204b610`). L'apparition
  dans TestFlight reste soumise au traitement du binaire par Apple.

## Parcours manuel complémentaire

1. Ouvrir une semaine déjà consultée, activer le mode avion, remplacer un
   dîner, ignorer un midi et retirer un autre repas.
2. Vérifier le compteur de changements en attente et redémarrer l'application.
3. Revenir en ligne et contrôler la disparition progressive de la file, sans
   doublon ni perte.
4. Compléter une semaine avec au moins deux favoris, contrôler midi et soir,
   puis annuler et recréer la liste de courses.
5. Ouvrir plusieurs fiches et contrôler les libellés d'estimation, la source,
   les allergènes et les visuels distincts en modes clair et sombre.
