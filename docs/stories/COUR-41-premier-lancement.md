# COUR-41 - Premier lancement et creation de compte

## User story

En tant que nouvel utilisateur, je veux creer un compte puis configurer mon
foyer afin que mes preferences et mon planning soient sauvegardes.

## Probleme

Le parcours historique envoyait un appareil neuf vers l'onboarding alors que
la finalisation exigeait deja une session. L'ecran de connexion ne proposait
pas la creation de compte, rendant le premier lancement impossible pour un
nouvel utilisateur, notamment sur Android.

## Criteres d'acceptation

- Sans session, la route racine ouvre la connexion.
- L'utilisateur peut basculer entre connexion et creation de compte.
- Email et mot de passe sont valides avant envoi.
- Un compte authentifie sans profil poursuit vers l'onboarding.
- Un compte avec profil charge ce profil et poursuit vers les onglets.
- Si une confirmation email est requise, un message explique l'etape suivante.
- Aucun profil local fantome n'est cree sans ecriture Supabase reussie.
- RevenueCat est initialise avec l'identifiant authentifie.
- Deconnexion et suppression vident les stores propres a l'utilisateur.
- Les etats erreur et chargement sont accessibles et traduits.

## Hors perimetre

- Reinitialisation du mot de passe.
- Magic link et autres fournisseurs sociaux.
- Refonte complete de l'onboarding.

## Verification

- Tests de connexion et d'onboarding.
- Test manuel nouvel utilisateur sur iOS et Android.
- Test de reprise apres fermeture de l'app.
- `tsc`, lint et couverture au vert.
