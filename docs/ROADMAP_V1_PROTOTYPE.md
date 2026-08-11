# Roadmap V1 prototype - CoursIA

## Objectif

Mettre rapidement entre les mains de premiers testeurs une application
francophone, stable et honnete, distribuable par TestFlight puis par un canal
de test Google Play. Cette V1 doit prouver la boucle hebdomadaire :

`compte -> profil -> planning -> liste -> utilisation en magasin`

Elle n'a pas besoin de simuler une plateforme finalisee. Les fonctions
partielles sont masquees ou presentees explicitement comme estimations.

## Principes de livraison

- Trois parcours fiables valent mieux que huit promesses partielles.
- Aucun bouton ne porte le label IA s'il n'appelle pas reellement le service IA.
- Aucun montant simule n'est presente comme une commande ou une economie reelle.
- Les erreurs de staging et production sont observables sans transmettre de
  donnees identifiantes ou alimentaires a Sentry.
- Une story n'est terminee qu'apres application de
  `docs/DEFINITION_OF_DONE.md`.

## Ordre professionnel

### S0 - Fondations de distribution

1. Parcours creation de compte / connexion / onboarding / reprise.
2. Marque publique CoursIA sur l'app, les stores et les documents.
3. Sentry minimal, source maps, environnement staging/production.
4. CGVU et confidentialite accessibles dans l'app et sur des URLs HTTPS.
5. Francais uniquement tant que DE/IT ne sont pas reellement traduits.

Condition de sortie : un nouvel utilisateur iOS ou Android peut creer un
compte, terminer son profil, fermer l'app, revenir et retrouver son etat.

### S1 - Boucle hebdomadaire fiable

1. Catalogue suffisant pour tester plusieurs semaines.
2. Planning manuel robuste avec etats chargement, vide, erreur et hors ligne.
3. Renommer la generation deterministe en "Remplir avec mes favoris" tant que
   l'IA n'est pas connectee.
4. Liste de courses hors ligne, cochage, ajout et suppression.

Condition de sortie : un foyer peut realiser deux semaines consecutives sans
assistance technique.

### S2 - Prix reels limites mais transparents

1. Comparaison ouverte a la demande pour un article.
2. Aucun chargement de prix avant action explicite.
3. Source, date, format, prix unitaire et peremption visibles.
4. Panier mocke clairement nomme "Simulation".

Condition de sortie : les prix de deux enseignes pilotes sont comparables et
l'ecart avec un ticket reel est mesure.

### S3 - Monetisation prototype

1. Gratuit + Standard comme test principal.
2. Achat et restauration RevenueCat verifies en sandbox.
3. Paywall apres un premier succes utilisateur.
4. Premium et Famille ne promettent que des fonctions disponibles.

Condition de sortie : achat, restauration, expiration et grace hors ligne sont
verifies sur appareil et par le webhook.

### S4 - Preparation store

1. Tests Maestro des trois parcours critiques.
2. Captures, description et declaration de confidentialite alignees au produit.
3. Compte de revue, suppression de compte et restauration des achats testes.
4. Build production, source maps Sentry et recette TestFlight.

Condition de sortie : checklist store complete, build installee et parcours
critiques executes sur appareil ou simulateur.

## Blocages externes a lever

- Identite juridique, adresse et contact legal definitifs.
- URLs HTTPS publiques des CGVU, de la confidentialite et du support.
- Projet Sentry, organisation, projet et secret de build.
- Produits RevenueCat / App Store Connect / Play Console valides.
- Historique Supabase a resynchroniser : neuf migrations distantes du
  28.07.2026 sont absentes du depot et bloquent actuellement `db push`, meme
  si la migration `20260809123024_add_profils_enfants_ages` est bien deployee.
- Accords ou base juridique pour les donnees de prix.

## Premieres stories

- `COUR-41` - Premier lancement et creation de compte.
- `COUR-42` - Observabilite Sentry respectueuse de la vie privee.
- `COUR-43` - Comparateur de prix reel depuis la liste de courses.
- `COUR-44` - Premiere passe graphique de l'accueil.
- `COUR-45` - Navigation principale native iOS et Android.
- `COUR-46` - Boucle directe Planning vers liste de courses.
- `COUR-47` - Catalogue prototype porté à 50 recettes vérifiées.
- `COUR-48` - États chargement, erreur, vide et hors ligne fiables dans Planning.
- `COUR-49` - Cache persistant et file hors ligne du planning.
- `COUR-50` - Planning midi/soir, remplissage pratique et annulation.
- `COUR-51` - Qualité, transparence et visuels distincts des recettes.
- `COUR-52` - Parcours principal automatisable avec Maestro.
- `COUR-53` - Liste de courses restaurable et synchronisation sans perte.
- `COUR-54` à `COUR-61` - Intégration SwissGroceries isolée, résiliente,
  déployable et limitée à une cohorte canary réversible.
- `COUR-62` - Activation mobile du canary pilotée exclusivement par le serveur.
- `COUR-64` - Stabilisation des sauvegardes, de l'observabilite et de
  l'exploitation pendant la recette TestFlight.
