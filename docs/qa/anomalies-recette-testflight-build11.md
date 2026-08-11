# COUR-40 — Anomalies de la recette TestFlight (build 11)

Recette du 29.07.2026, iPhone 14 / iOS 26, build `1.0.0 (11)`, commit `45fb09c`.
Testeur : Antoine Quarroz.

## Pourquoi 8 tickets et non 24

La checklist a relevé 24 cas ❌. L'analyse des logs de production montre que **20 d'entre eux sont le même défaut observé depuis 20 écrans** (COUR-40-A). Ouvrir un ticket par symptôme donnerait 20 tickets fermés par un seul commit, et masquerait les 7 défauts réellement distincts.

Chaque ticket ci-dessous liste donc les cas de recette qu'il couvre : la traçabilité vers la checklist est conservée, et le critère « chaque anomalie devient un ticket Bug » est satisfait au niveau du défaut.

| Ticket | Défaut | Sévérité | Cas couverts |
| --- | --- | --- | --- |
| A | Onboarding finalisable sans session → profil fantôme `demo-user` | **Bloquant** | 4.4, 5.4, 6.2, 6.4, 6.5, 7.1, 7.8, 10.1, 10.2 (+ 6.6, 6.7, 7.2, 8.x, 9.x en ⏭️) |
| B | Sign in with Apple échoue | **Bloquant** | 2.1, 2.2 |
| C | Clé RevenueCat absente du build | **Bloquant** | 11.1, 11.2 (faux ✅), 11.3→11.7, 10.5→10.7 |
| D | Sous-onglets Planning/Communauté et sections repliables inertes | **Bloquant** | 6.1, 7.5 |
| E | Notifications jamais reçues | Majeur | 13.4, 13.5, 13.6 |
| F | Mode hors-ligne absent | Majeur | 14.1, 14.2, 14.3, 14.4, 14.5 |
| G | Lien CGVU inopérant | Majeur | 3.2 |
| H | Fluidité du swipe Goûts | Mineur | 4.1 |

**Décision de recette** : la build 11 est **rejetée**. Quatre défauts bloquants sont ouverts, dont A qui rend l'app inutilisable pour tout compte créé sans session Apple.

---

## COUR-40-A — Un onboarding terminé sans session crée un profil fantôme, toutes les écritures serveur échouent ensuite

**Sévérité** : Bloquant · **Composant** : Onboarding / Auth

### Étapes de reproduction
1. Installer la build 11 sur un appareil sans session CoursIA active.
2. À l'écran de connexion, tenter « Sign in with Apple » — la connexion échoue (voir COUR-40-B).
3. Accéder à l'onboarding et le dérouler jusqu'au bout, appuyer sur « Terminer ».
4. L'app redirige vers l'accueil et affiche le prénom saisi : tout semble normal.
5. Aller dans Planning, assigner une recette à un midi.

### Résultat attendu
Soit l'onboarding refuse de se terminer faute de session, soit le profil est réellement enregistré et le planning fonctionne.

### Résultat observé
L'assignation échoue silencieusement. Idem pour les swipes de Goûts, la génération de la liste de courses, la validation de commande, les préférences du profil. Aucun message d'erreur n'est affiché à l'utilisateur.

### Preuve — logs Postgres de production, 29.07.2026
```
2026-07-29T11:03:50Z ERROR  invalid input syntax for type uuid: "demo-user"
2026-07-29T09:50:50Z ERROR  insert or update on table "repas_planifies"
                            violates foreign key constraint "repas_planifies_profil_id_fkey"
2026-07-29T15:36:10Z ERROR  insert or update on table "swipes"
                            violates foreign key constraint "swipes_profil_id_fkey"
```

### Cause racine
`app/(auth)/onboarding.tsx`, fonction `finaliser` :
```js
id: session.session?.user.id ?? 'demo-user',
…
useProfilStore.getState().setProfil(profilComplet);
if (session.session?.user) { await supabase.from('profils').upsert(profilComplet); }
```
Sans session, le profil est écrit **uniquement dans le store zustand** avec l'id littéral `'demo-user'`. Aucune ligne `profils` n'existe en base. Toute écriture ultérieure référence un `profil_id` inexistant → violation de clé étrangère. De plus, le résultat de l'`upsert` n'était jamais vérifié, donc même un échec d'écriture avec session passait inaperçu.

### Correctif
Commit sur `main` : l'onboarding refuse de se finaliser sans session (toast + redirection vers la connexion), l'écriture serveur précède la mise à jour du store, et une erreur d'`upsert` bloque l'entrée dans l'app. Couvert par deux tests dans `__tests__/app/onboarding.test.tsx`.

---

## COUR-40-B — Sign in with Apple échoue

**Sévérité** : Bloquant · **Composant** : Auth · **Cas** : 2.1, 2.2

### Étapes
1. Écran de connexion, appuyer sur le bouton « Sign in with Apple ».
2. Compléter la feuille Apple native (tester aussi l'option « Masquer mon e-mail »).

### Attendu
Retour dans l'app authentifié, session Supabase créée.

### Observé
Erreur au login, aucune session créée.

### Piste
Les logs GoTrue de production sur 24 h montrent 100 requêtes (91 `/user`, 4 `/token`, 1 `/logout`) et **aucun appel correspondant à `signInWithIdToken`**. L'échec se produit donc côté client, avant tout contact avec Supabase. À vérifier dans cet ordre :
1. Capability « Sign in with Apple » présente dans le provisioning profile de `ch.courseo.app`.
2. Provider Apple activé et configuré dans Supabase → Authentication → Providers.
3. Services ID / Team ID / clé cohérents entre Apple Developer et Supabase.

**Ticket bloquant pour A** : tant que B n'est pas résolu, aucun compte ne peut être créé via Apple.

---

## COUR-40-C — La clé RevenueCat est absente du build de production

**Sévérité** : Bloquant · **Composant** : Build / Abonnement · **Cas** : 11.1→11.7, 10.5→10.7

### Preuve
`EXConstants.bundle/app.config` extrait de l'IPA de la build 11 :
```json
"extra": {
  "supabaseUrl": "https://bpycfeyapuekmesmxnvd.supabase.co",
  "supabaseAnonKey": "eyJ…",
  "appEnv": "development"
}
```
`revenuecatKeyIos` n'y figure pas — la variable `REVENUECAT_API_KEY_IOS` n'existe pas dans l'environnement EAS `production`.

### Conséquences
- `initRevenueCat` sort immédiatement (« Cle API manquante — abonnements desactives »).
- **Le cas 11.2 est un faux ✅** : les prix affichés sont les prix marketing statiques de `PALIERS_ABONNEMENT`, pas ceux du store. Le cas a en réalité échoué.
- 11.1 « rien ne se passe » au tap sur une fonctionnalité verrouillée est cohérent avec un SDK non configuré.
- Tous les cas nécessitant un palier payant (10.5→10.7) restent intestables.

### Correctif
1. Créer l'app *App Store* dans RevenueCat (bundle `ch.courseo.app`), récupérer la clé publique `appl_…`.
2. `eas env:create production --name REVENUECAT_API_KEY_IOS --value appl_… --visibility sensitive`.
3. Configurer produits App Store Connect + offering « Current » avec les entitlements `standard` / `premium` / `famille` (`lib/revenuecat.ts:25`).
4. Voir `docs/entitlements/test-sandbox-app-store.md` pour le protocole complet.

---

## COUR-40-D — Sous-onglets et sections repliables inertes

**Sévérité** : Bloquant · **Composant** : UI · **Cas** : 6.1, 7.5

### Observé
La bascule entre les sous-onglets Recettes / Planning / Communauté ne change pas d'onglet. Les sections de rayon de la liste de courses ne se replient pas.

### Contexte important
Ce défaut avait été **détecté par les tests automatiques en COUR-38** : `fireEvent.press` sur le `SegmentedControl` n'invoquait jamais son gestionnaire. La conclusion retenue à l'époque — « artefact de l'environnement de test » — était vraisemblablement erronée : le même comportement se reproduit sur appareil réel.

À reprendre en priorité, en repartant de l'hypothèse inverse : le `Pressable` du `SegmentedControl` ne reçoit réellement pas ses événements tactiles (zone de tap, `hitSlop`, parent avec `pointerEvents`, ou conflit avec un gesture handler parent).

---

## COUR-40-E — Aucune notification n'est reçue

**Sévérité** : Majeur · **Composant** : Notifications · **Cas** : 13.4, 13.5, 13.6

### Observé
Les permissions sont accordées et les rappels apparaissent comme planifiés (13.1 ✅), mais aucune notification n'arrive jamais. Le tap sur notification (13.4, 13.5) n'a donc pas pu être vérifié. Désactiver les notifications depuis le profil ne change rien (13.6).

### Piste
`lib/notifications.ts` utilise des triggers `WEEKLY` : un rappel hebdomadaire ne se déclenche pas pendant une session de recette. Il faut soit un moyen de déclencher un rappel à la demande en build de test, soit tester avec un trigger court. Vérifier aussi que `annulerNotifications` est bien appelé quand les switches du profil changent.

---

## COUR-40-F — Le mode hors-ligne ne se manifeste pas

**Sévérité** : Majeur · **Composant** : Réseau · **Cas** : 14.1→14.5

### Observé
En mode Avion, aucun bandeau hors-ligne n'apparaît (14.1). Les articles cochés hors-ligne ne sont pas conservés (14.2), rien ne se synchronise au retour du réseau (14.3), et le chargement des recettes hors-ligne n'affiche ni message d'erreur ni bouton « Réessayer » (14.5).

### Note
Une partie de ces cas dépend de COUR-40-A (sans profil valide, la liste de courses ne peut rien persister côté serveur). **À rejouer une fois A corrigé** avant d'investiguer plus loin : le périmètre réel de F pourrait se réduire au seul bandeau (`hooks/useNetworkStatus.ts`).

---

## COUR-40-G — Le lien CGVU ne s'ouvre pas

**Sévérité** : Majeur · **Composant** : Onboarding · **Cas** : 3.2

### Observé
À l'étape 1 de l'onboarding, le lien vers les CGVU ne permet pas d'ouvrir le document.

### Pourquoi c'est plus qu'un détail
L'utilisateur doit cocher « j'accepte les CGVU » pour continuer, sans pouvoir les consulter. C'est un problème de conformité, et un motif de rejet possible en review App Store.

---

## COUR-40-H — Swipe de l'écran Goûts peu fluide

**Sévérité** : Mineur · **Composant** : UI · **Cas** : 4.1

### Observé
L'animation de swipe des cartes de recettes n'est « pas super fluide ».

À qualifier avec la note complète du testeur (saccades ? latence au premier swipe ? uniquement après plusieurs cartes ?) avant d'investiguer.

---

## Écarts de méthode à corriger pour la prochaine recette

1. **Un seul appareil testé.** Le critère demande au moins deux appareils dont un petit écran (SE / mini) — non satisfait.
2. **Notes tronquées.** L'export PDF coupe les observations à ~15 caractères. Réexporter le JSON depuis la checklist HTML avant de compléter les tickets E, F, H qui en dépendent.
3. **`APP_ENV=development` dans l'environnement EAS `production`.** Sans impact fonctionnel (`appEnv` n'est lu nulle part dans le code) mais c'est faux, et c'est la raison pour laquelle la ligne « Profil de build » du contexte technique n'a pas pu être vérifiée. À corriger côté EAS.
4. **Référentiel de la checklist en retard.** Le tableau §0 attend `buildNumber: 10` alors que la build recettée est la 11.
5. **COUR-42, déclaré bloqueur de COUR-40**, n'a pas été confirmé résolu avant la recette.
