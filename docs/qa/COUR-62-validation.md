# COUR-62 — Rapport de validation

## Portée livrée

- endpoint Edge d'éligibilité authentifié et minimal ;
- hook mobile d'éligibilité fermé par défaut, lié au profil courant ;
- affichage de l'optimisation live uniquement pour le canary autorisé ;
- conservation intégrale de la simulation pour tous les autres comptes ;
- capacité canary embarquée dans les profils EAS preview et production, sans
  pouvoir ouvrir l'accès sans autorisation serveur.

## Validation locale exécutée

- `npx supabase db reset` : vert après rejeu complet des 50 migrations et du
  seed final sur un stack isolé ;
- `scripts/verify-swissgroceries-canary.sh` : vert contre la vraie API locale
  GoTrue — Gratuit allowlisté `eligible=false` et refus métier 403, Standard
  allowlisté `eligible=true` et garde franchie, Standard hors cohorte
  `eligible=false` et refus métier 503 ;
- `npm --prefix services/swissgroceries-gateway test` : 26/26 tests verts ;
- parsing des sept workflows GitHub Actions et de `eas.json` : vert ;
- `npx tsc --noEmit` : vert ;
- `npm run lint` : vert, aucun warning ;
- `npm test -- --coverage --runInBand` : 44 suites, 265 tests, tous verts ;
- tests UI automatisés : compte non éligible sur la simulation, compte éligible
  sur la carte « En test », erreur réseau fermée et changement de compte sans
  héritage d'éligibilité.

La suite Jest conserve des avertissements historiques Supabase non configuré,
`act(...)` et worker forcé à quitter, mais termine avec le code 0. La
configuration temporaire et le profil CLI ont été restaurés ; le stack local
CoursIA a été arrêté après la recette.

## Recette appareil requise

À exécuter sur une prochaine build TestFlight après validation de la licence et
déploiement contrôlé :

1. compte Gratuit allowlisté : la carte « Simulation de panier » reste visible ;
2. compte Standard+ hors cohorte : même expérience, sans indice sur le canary ;
3. compte Standard+ de la cohorte : carte « Où faire mes courses ? » avec le
   badge « En test », sans récapitulatif simulé ;
4. déconnexion puis connexion à un autre compte : aucune éligibilité héritée ;
5. mode serveur `off` : les appels métier sont immédiatement refusés et l'écran
   revient à l'expérience standard au prochain rafraîchissement d'éligibilité.

## Limites explicites

L'Edge Function, le gateway et les workflows ne sont pas déployés à distance
tant que la licence SwissGroceries n'est pas approuvée. La CI distante ne peut
pas être confirmée avant un push. Aucun test iOS sur appareil ni publication
TestFlight n'est compris dans ce ticket local ; le protocole ci-dessus est prêt
pour cette validation. COUR-62 est donc validé localement, mais ces points de la
Definition of Done restent explicitement en attente externe.
