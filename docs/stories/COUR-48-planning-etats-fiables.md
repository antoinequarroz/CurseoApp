# COUR-48 — États fiables du Planning

## Intention

En tant que testeur de coursIA, je veux comprendre immédiatement si les
recettes chargent, sont indisponibles, absentes ou simplement incompatibles
avec mon profil, afin de toujours savoir quelle action effectuer ensuite.

## Matrice des états

| État | Contenu affiché | Action proposée |
|---|---|---|
| Premier chargement en ligne | Skeleton de recette annoncé aux technologies d'assistance | Attendre |
| Erreur sans cache | Message calme indiquant de vérifier la connexion | Réessayer |
| Catalogue distant vide | Explication distincte d'un problème de filtres | Actualiser le catalogue |
| Catalogue filtré à zéro | Explication liée aux régimes et allergies du foyer | Modifier mon profil |
| Hors ligne sans cache | Aucun chargement infini ; le besoin de reconnexion est explicite | Reconnexion système |
| Hors ligne avec cache | Dernières recettes chargées conservées avec bannière | Continuer à consulter et aimer |
| Erreur de rafraîchissement avec cache | Recettes conservées avec avertissement non bloquant | Réessayer |
| Semaine hors ligne sans cache | Explication à la place d'un skeleton infini | Reconnecter l'appareil |
| Erreur de semaine avec cache | Dernier planning conservé avec avertissement | Réessayer |

## Critères d'acceptation

- [x] Le catalogue vide et l'absence de recette compatible sont distingués.
- [x] Une erreur de rafraîchissement ne remplace pas des recettes en cache.
- [x] Une erreur de rafraîchissement ne remplace pas un planning en cache.
- [x] Un démarrage hors ligne sans cache ne reste pas sur un skeleton infini.
- [x] Le mode hors ligne n'annonce plus une synchronisation qui n'existe pas.
- [x] Chaque état bloquant explique la prochaine action possible.
- [x] Les contrôles ajoutés ont une cible tactile d'au moins 44 × 44 points.
- [x] Le chargement et la perte de connexion sont annoncés poliment aux
  technologies d'assistance.
- [x] TypeScript, lint, tests complets, couverture et Expo Doctor sont verts.
- [ ] Les états sont contrôlés sur un simulateur ou appareil iOS/Android.

## Décisions

- Le cache React Query en mémoire est utilisé lorsqu'il existe ; COUR-48
  n'introduit pas encore de persistance disque du catalogue.
- `hasCachedData` distingue une requête jamais résolue d'un résultat déjà reçu,
  même lorsque ce résultat est vide.
- Une erreur avec cache devient un avertissement non bloquant. Sans cache, elle
  reste un état d'erreur plein écran.
- Aucun changement de schéma, migration, policy RLS ou Edge Function.

## Protocole appareil

1. Ouvrir Planning → Recettes avec une connexion active et vérifier le skeleton
   puis la première recette.
2. Couper le réseau après chargement : la recette reste visible et la bannière
   hors ligne apparaît.
3. Forcer l'arrêt, vider les données de l'application, relancer hors ligne :
   l'état « Recettes indisponibles hors ligne » apparaît sans spinner infini.
4. Reconnecter l'appareil et toucher « Réessayer » ou relancer l'écran.
5. Tester un profil dont les contraintes excluent toutes les recettes : l'état
   compatible renvoie vers le Profil, sans prétendre que le catalogue est vide.
6. Avec VoiceOver ou TalkBack, vérifier l'annonce du chargement, de la bannière
   hors ligne et le nom « Réessayer » du bouton icône.

## Preuves d'exécution — 10 août 2026

- `npx tsc --noEmit` : réussi.
- `npm run lint` : réussi sans warning.
- `npm test -- --coverage --runInBand` : 37 suites et 224 tests réussis.
- `npx expo-doctor` : 20/20 contrôles réussis.
- Exports de production Expo Android et iOS : réussis.
- Aucun secret serveur (`service_role`, token Supabase ou clé OpenAI) détecté
  dans les deux bundles exportés.
- Tests COUR-48 : 3 tests réseau, 15 tests catalogue, 10 tests semaine et 8
  tests d'écran réussis.
- Validation visuelle non déclarée comme faite : l'AVD `Pixel_10_Pro` est resté
  bloqué avant `sys.boot_completed` lors de deux lancements, y compris une
  relance à froid sans snapshot. Aucune capture fiable ni interaction appareil
  n'a donc pu être produite. Le protocole ci-dessus reste à exécuter sur le
  prochain appareil ou build TestFlight.
