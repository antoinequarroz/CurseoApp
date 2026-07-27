# COUR-32 — Protocole de test : achat sandbox App Store de bout en bout

> Ce test nécessite un Mac (Xcode), un iPhone physique, un compte Apple Developer et un testeur sandbox App Store Connect — aucun de ces éléments n'est disponible dans cet environnement de développement. Ce document formalise le protocole à suivre pour que le test puisse être exécuté et ses preuves jointes au ticket Jira, conformément au critère « Des preuves datées du test sont jointes au ticket ».

## 0. Constat de départ (ce qui bloquait le test avant ce ticket)

En préparant COUR-32, deux lacunes empêchaient tout achat réel, même avec un appareil disponible :

1. `initRevenueCat()` (`lib/revenuecat.ts`) n'était appelé **nulle part** dans l'app — le SDK RevenueCat n'était donc jamais initialisé au runtime.
2. `PaywallModal` n'appelait aucune fonction d'achat (`Purchases.purchasePackage`) — le bouton « Continuer » fermait simplement la modale (paywall 100 % visuel/mock).

Ces deux points sont corrigés dans ce ticket (voir commit associé) :
- `initRevenueCat(userId)` est maintenant appelé au démarrage de l'app (session existante, `app/_layout.tsx`) et à la fin de l'onboarding (`app/(auth)/onboarding.tsx`).
- `PaywallModal` récupère les offres réelles via `fetchOffreCourante()`, affiche le prix/la période réels du store quand un produit est configuré pour le palier choisi, lance un achat réel via `acheterPackage()`, distingue explicitement une annulation utilisateur d'une erreur (ne bloque jamais l'UI), et reflète immédiatement le nouveau palier dans l'app via un écouteur `CustomerInfo` (`ecouterMisesAJourAbonnement`), sans attendre le webhook.

**Ce qui reste hors de portée du code et nécessite une action humaine sur les plateformes tierces avant de pouvoir exécuter ce protocole** :
- Créer au moins un produit d'abonnement dans App Store Connect (ex. `coursia_standard_monthly`, convention proposée dans [`matrice-droits.md`](./matrice-droits.md)).
- Créer l'offering correspondant dans le dashboard RevenueCat et l'associer à l'entitlement `standard` (voir `ENTITLEMENT_IDS` dans `lib/revenuecat.ts`).
- Créer un testeur sandbox dans App Store Connect (Utilisateurs et accès → Testeurs Sandbox).
- Disposer d'un build TestFlight installé sur un iPhone physique (le simulateur iOS ne supporte pas les achats sandbox StoreKit réels de bout en bout de façon fiable).

## 1. Prérequis avant de commencer

- [ ] Produit(s) créés et « Prêt à être soumis » dans App Store Connect.
- [ ] Offering RevenueCat configuré et marqué « Current ».
- [ ] `REVENUECAT_API_KEY_IOS` renseignée dans l'environnement de build TestFlight (`.env` / secrets EAS).
- [ ] Compte testeur sandbox créé (email dédié, jamais utilisé sur un vrai compte Apple ID).
- [ ] iPhone physique, déconnecté de tout compte Apple ID sandbox précédent (Réglages → App Store → Compte sandbox → Se déconnecter) pour repartir d'un état propre.
- [ ] Build TestFlight à jour installé (incluant les changements de ce ticket).

## 2. Déroulé du test (mappé aux critères d'acceptation)

1. **Ouvrir le paywall** (ex. tenter d'accéder au Comparateur de prix sans abonnement Standard+).
   - ✅ Critère « Le produit est visible avec le bon prix et la bonne période » : le prix affiché sur la carte du palier doit correspondre au prix réel configuré dans App Store Connect (localisé CHF), pas au texte statique `CHF 7.90/mois` codé en dur si un produit réel est configuré.
2. **Sélectionner le palier** et appuyer sur « Continuer ».
   - La fenêtre native StoreKit de confirmation d'achat sandbox doit s'ouvrir.
3. **Confirmer l'achat** avec le compte testeur sandbox (mot de passe Apple ID sandbox, pas Face ID/Touch ID habituel).
   - ✅ Critère « L'achat sandbox aboutit sur appareil réel ».
4. **Observer l'app immédiatement après confirmation**, sans la fermer ni la relancer.
   - ✅ Critère « L'interface se met à jour sans redémarrage » : le paywall doit se fermer, un toast de confirmation doit apparaître, et la fonctionnalité précédemment verrouillée (ex. Comparateur de prix) doit devenir accessible immédiatement.
5. **Vérifier le droit dans RevenueCat** : dashboard RevenueCat → Customers → rechercher l'`app_user_id` (l'UUID Supabase de l'utilisateur test) → l'entitlement correspondant doit apparaître actif.
6. **Vérifier le droit dans l'app/la base** : `profils.abonnement` (table Supabase, visible via Studio ou `select abonnement from profils where id = '<uuid>'`) doit refléter le nouveau palier après le passage du webhook (peut prendre quelques secondes — le webhook RevenueCat doit avoir reçu et traité l'événement `INITIAL_PURCHASE`).
   - ✅ Critère « Le droit attendu est actif dans RevenueCat et dans l'application ».
7. **Tester l'annulation** : relancer un achat sur un autre palier, puis fermer la fenêtre StoreKit sans confirmer.
   - ✅ Critère « Les erreurs et annulations sont gérées sans blocage » : aucun message d'erreur ne doit apparaître, le paywall doit rester utilisable, un nouvel essai doit être possible immédiatement.
8. **Tester une erreur réseau** (optionnel mais recommandé) : couper la connexion juste avant de confirmer l'achat.
   - Le toast d'erreur (`paywall.achat_echec`) doit s'afficher, sans crash ni blocage de l'UI.

## 3. Preuves à joindre au ticket Jira

Pour chaque étape 1 à 7 ci-dessus, joindre une capture d'écran datée (l'horodatage du téléphone doit être visible ou mentionné dans le nom de fichier) :
- Capture du prix affiché dans le paywall (étape 1).
- Capture de la fenêtre StoreKit sandbox (étape 3).
- Capture de l'UI mise à jour post-achat, avec l'heure système visible (étape 4).
- Capture du dashboard RevenueCat montrant l'entitlement actif pour l'`app_user_id` testé (étape 5).
- Capture de la ligne `profils.abonnement` correspondante dans Supabase Studio (étape 6).
- Capture du paywall après une annulation, montrant l'absence de blocage (étape 7).

## 4. En cas d'échec

Si une étape échoue, noter précisément : le message d'erreur exact affiché, l'étape concernée, et vérifier en premier lieu que le produit/offering est bien marqué actif côté RevenueCat/App Store Connect avant de suspecter un bug applicatif — la cause la plus fréquente d'échec à ce stade est une configuration de produit/offering incomplète plutôt qu'un bug de code.
