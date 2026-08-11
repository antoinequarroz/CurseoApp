# Parcours E2E coursIA

Le flow `parcours-principal.yaml` couvre la boucle critique avec un compte de
test déjà onboardé : connexion, chargement du profil, ajout d'un favori,
planning midi/soir, puis génération de la liste de courses.

```powershell
maestro test `
  -e APP_ID=ch.courseo.app `
  -e E2E_EMAIL=<compte-test> `
  -e E2E_PASSWORD=<mot-de-passe> `
  .maestro/parcours-principal.yaml
```

Matrice de recette avant diffusion :

- petit iPhone : iPhone 13 mini, iOS 18.2 (Maestro Cloud) ;
- grand iPhone : iPhone 16 Pro Max, iOS 18.2 (Maestro Cloud) ;
- Android : Pixel/émulateur Google APIs, API 34.

Les secrets restent des variables d'exécution et ne sont jamais enregistrés
dans le dépôt. Sous Windows, l'exécution locale est limitée à Android; les
deux formats iOS passent par un runner macOS ou Maestro Cloud.
