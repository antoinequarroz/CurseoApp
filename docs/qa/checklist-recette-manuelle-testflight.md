# COUR-40 — Checklist de recette manuelle sur TestFlight

> **Ce document ne peut pas être exécuté depuis l'environnement de développement.** La recette demande un iPhone physique, un build TestFlight installé et un testeur humain qui manipule l'app. Ce fichier formalise la checklist à dérouler et à signer, conformément au critère de vérification « Checklist signée et preuves jointes à ce ticket ». Aucune case ne doit être cochée par anticipation : une case cochée engage le testeur qui signe en fin de document.
>
> **Bloqueur déclaré** : le ticket est marqué « is blocked by COUR-42 ». Vérifier que COUR-42 est résolu avant de lancer la recette, sinon les résultats seront à rejouer.

## 0. Contexte technique de la build

Valeurs lues dans `app.config.ts` / `eas.json` au moment de la rédaction — **à revérifier et corriger** au moment de la recette, elles évoluent à chaque build.

| Élément | Valeur attendue |
| --- | --- |
| Nom affiché | Coursia |
| `version` | 1.0.0 |
| `ios.buildNumber` | 10 |
| `bundleIdentifier` | `ch.courseo.app` |
| App Store Connect `ascAppId` | 6790903786 |
| Profil de build | `production` (`APP_ENV=production`) |
| Orientation | Portrait uniquement |
| iPad | Non supporté (`supportsTablet: false`) |

**Point d'attention** : `APP_ENV=production` fait pointer l'app sur la **base Supabase de production**. Toute donnée créée pendant la recette (compte, foyer, planning, commande) est une donnée réelle. Prévoir la suppression des comptes de test en fin de recette, ou utiliser le profil `preview` (`APP_ENV=staging`) si un environnement de staging est disponible.

## 1. Appareils et versions testés

À remplir — critère d'acceptation « Les appareils et versions iOS testés sont consignés ». Au moins deux appareils, dont un petit écran (SE/mini) pour les risques de troncature et un grand écran.

| Appareil | Version iOS | Build TestFlight | Testeur | Date |
| --- | --- | --- | --- | --- |
| | | | | |
| | | | | |

## 2. Comment consigner une anomalie

Critère « Chaque anomalie devient un ticket Bug avec étapes et preuve ». Pour chaque case cochée ❌ :

1. Créer un ticket Jira de type **Bug** dans le projet COUR, lié à COUR-40 (`relates to`).
2. Titre : `[Écran] symptôme observé en une ligne`.
3. Corps obligatoire :
   - **Appareil / iOS / build** (reprendre la ligne du tableau §1)
   - **Étapes de reproduction** numérotées, depuis le lancement de l'app
   - **Résultat attendu** vs **résultat observé**
   - **Preuve** : capture d'écran ou enregistrement vidéo, horodaté
   - **Reproductibilité** : systématique / intermittent (n fois sur m)
4. Sévérité : **Bloquant** si l'anomalie empêche de terminer un parcours, corrompt des données, ou expose une donnée d'un autre utilisateur.
5. Reporter le numéro du ticket dans la colonne « Anomalie » de la checklist.

---

## 3. Checklist par parcours

Légende : ✅ conforme · ❌ anomalie (→ n° de ticket) · ⏭️ non testable (justifier)

### 3.1 Installation et premier lancement

| # | Cas | Attendu | Statut | Anomalie |
| --- | --- | --- | --- | --- |
| 1.1 | Installer depuis TestFlight | Installation sans erreur, icône Coursia correcte (pas d'icône générique) | | |
| 1.2 | Premier lancement | Splash screen vert forêt (`#0F2D27`), pas d'écran blanc prolongé | | |
| 1.3 | Rotation de l'appareil | L'app reste en portrait | | |
| 1.4 | Mode sombre (Réglages iOS → Apparence) | Thème sombre appliqué, texte lisible partout | | |
| 1.5 | Taille de texte accessibilité (Réglages → Affichage → Taille du texte, max) | Aucun texte tronqué ou superposé sur les écrans principaux | | |

### 3.2 Inscription et connexion

`app/(auth)/connexion.tsx` — deux méthodes : Apple et email/mot de passe.

| # | Cas | Attendu | Statut | Anomalie |
| --- | --- | --- | --- | --- |
| 2.1 | Connexion avec Apple (Sign in with Apple) | Feuille Apple native, retour dans l'app connecté | | |
| 2.2 | Connexion Apple en masquant l'email | Compte créé malgré l'email relais Apple | | |
| 2.3 | Inscription email + mot de passe | Compte créé, session ouverte | | |
| 2.4 | Mot de passe erroné | Message d'erreur explicite en français, pas de crash ni message technique brut | | |
| 2.5 | Email déjà utilisé | Message clair, pas de création silencieuse d'un doublon | | |
| 2.6 | Tuer l'app puis rouvrir | Session conservée, pas de reconnexion demandée | | |

### 3.3 Onboarding

`app/(auth)/onboarding.tsx` — 5 étapes.

| # | Cas | Attendu | Statut | Anomalie |
| --- | --- | --- | --- | --- |
| 3.1 | Étape 1 sans accepter les CGVU | Bouton « Suivant » désactivé | | |
| 3.2 | Lien CGVU | Le document s'ouvre et est lisible | | |
| 3.3 | Saisie du prénom | Clavier n'occulte pas le champ, texte visible | | |
| 3.4 | Nombre de personnes / enfants + âges | Les âges ne s'affichent que si nb_enfants > 0 | | |
| 3.5 | Régimes et allergies (dont « Autres » en texte libre) | Sélection multiple, allergie libre enregistrée | | |
| 3.6 | Objectifs + enseignes favorites | Sélection multiple fonctionnelle | | |
| 3.7 | Bouton « Passer » sur les étapes optionnelles | Onboarding terminable sans tout remplir | | |
| 3.8 | Retour en arrière entre étapes | Les saisies précédentes sont conservées | | |
| 3.9 | Fin d'onboarding | Redirection vers l'accueil, prénom affiché correctement | | |
| 3.10 | Tuer l'app en cours d'onboarding puis rouvrir | Reprise cohérente, pas d'état corrompu | | |

### 3.4 Goûts

`app/gouts.tsx` — swipe de préférences + sondage.

| # | Cas | Attendu | Statut | Anomalie |
| --- | --- | --- | --- | --- |
| 4.1 | Swipe droite / gauche sur une recette | Animation fluide, carte suivante affichée | | |
| 4.2 | Double-swipe très rapide | Une seule carte consommée (pas de saut de deux) | | |
| 4.3 | Fin du paquet de cartes | État final propre, pas d'écran vide sans message | | |
| 4.4 | Quitter puis revenir | Préférences conservées | | |

### 3.5 Recettes

`app/(tabs)/planifier.tsx` (onglet Recettes) et `app/recette/[id].tsx`.

| # | Cas | Attendu | Statut | Anomalie |
| --- | --- | --- | --- | --- |
| 5.1 | Chargement du catalogue | Skeleton puis recettes réelles, images affichées | | |
| 5.2 | Scroll et pagination | Chargement des pages suivantes sans doublon ni saut | | |
| 5.3 | Ouvrir le détail d'une recette | Ingrédients, étapes, temps, coût affichés | | |
| 5.4 | Recette contenant un allergène déclaré au profil | Alerte de compatibilité visible | | |
| 5.5 | Titres longs | Troncature propre, pas de débordement | | |
| 5.6 | Deep link `courseo://recette/<id>` | Ouvre la bonne recette | | |

### 3.6 Planning

Onglet Planning de `app/(tabs)/planifier.tsx`.

| # | Cas | Attendu | Statut | Anomalie |
| --- | --- | --- | --- | --- |
| 6.1 | Bascule entre les sous-onglets Recettes / Planning / Communauté | Changement d'onglet effectif *(non couvert par les tests auto — COUR-38 : bug d'environnement sur le SegmentedControl, à valider soigneusement à la main)* | | |
| 6.2 | Assigner une recette à un midi et un soir | Vignettes correctes dans la bonne case | | |
| 6.3 | Navigation semaine précédente / suivante | Dates correctes, données de la bonne semaine | | |
| 6.4 | Modifier le nombre de personnes d'un repas (invités) | Valeur conservée | | |
| 6.5 | Marquer un repas comme ignoré | État distinct d'un repas vide | | |
| 6.6 | Retirer un repas planifié | Case revient à l'état vide | | |
| 6.7 | Semaine entièrement planifiée | Message « Semaine complète ! » | | |

### 3.7 Courses

`app/(tabs)/courses.tsx`.

| # | Cas | Attendu | Statut | Anomalie |
| --- | --- | --- | --- | --- |
| 7.1 | Générer la liste depuis le planning | Ingrédients agrégés, regroupés par rayon | | |
| 7.2 | Cocher / décocher un article | État persistant après fermeture de l'app | | |
| 7.3 | Ajouter un article libre (hors recette) | Article ajouté au bon rayon | | |
| 7.4 | Supprimer un article | Retrait immédiat | | |
| 7.5 | Replier / déplier une section de rayon | Comportement correct | | |
| 7.6 | Mode « Prix minimum » (gratuit) | Accessible sans paywall | | |
| 7.7 | Mode « Équilibré » sans palier Standard | Paywall s'ouvre, mode non appliqué | | |
| 7.8 | Valider la commande | Récapitulatif avec montant correct, confirmation | | |
| 7.9 | Liste vide | Message « Rien dans ta liste » | | |

### 3.8 Économies

`app/(tabs)/economies.tsx`.

| # | Cas | Attendu | Statut | Anomalie |
| --- | --- | --- | --- | --- |
| 8.1 | Donut budget | Proportions cohérentes avec le budget et le consommé | | |
| 8.2 | Montants en CHF | Format `CHF 0.00`, chiffres non coupés (risque de clipping connu sur les grands montants) | | |
| 8.3 | Aucune commande passée | État vide explicite, pas de donut vide sans explication | | |
| 8.4 | Badge meilleure enseigne | Enseigne réelle, pas un placeholder | | |

### 3.9 Communauté

Onglet Communauté de `app/(tabs)/planifier.tsx`.

| # | Cas | Attendu | Statut | Anomalie |
| --- | --- | --- | --- | --- |
| 9.1 | Liste des recettes communautaires publiées | Chargement correct | | |
| 9.2 | Soumettre une recette | Champs obligatoires (source, droits image, allergènes) exigés | | |
| 9.3 | Soumettre sans champ obligatoire | Refus avec message clair | | |
| 9.4 | Retrouver sa propre soumission | Visible avec son statut (brouillon / en attente) | | |
| 9.5 | Signaler une recette | Confirmation affichée | | |
| 9.6 | Liste communautaire vide | Message d'état vide | | |

### 3.10 Profil

`app/(tabs)/profil.tsx` et écrans liés (`mon-foyer`, `membres-foyer`, `adresses`, `aide`).

| # | Cas | Attendu | Statut | Anomalie |
| --- | --- | --- | --- | --- |
| 10.1 | Modifier une préférence (budget, régimes) | Sauvegarde effective après réouverture de l'app | | |
| 10.2 | Basculer chaque switch de notification | État conservé | | |
| 10.3 | Changer l'apparence (clair / sombre / auto) | Application immédiate | | |
| 10.4 | Mon foyer / Adresses / Aide | Écrans accessibles et fonctionnels | | |
| 10.5 | Membres du foyer **sans** palier Famille | Paywall explicite mentionnant le palier requis | | |
| 10.6 | Membres du foyer **avec** palier Famille | Ajout / modification / retrait fonctionnels | | |
| 10.7 | Dépasser 6 membres | Refus explicite | | |
| 10.8 | Déconnexion | Retour à l'écran de connexion, données locales purgées | | |
| 10.9 | Suppression de compte | Confirmation par email exigée, compte réellement supprimé | | |

### 3.11 Abonnement

Voir aussi le protocole détaillé d'achat sandbox : [`docs/entitlements/test-sandbox-app-store.md`](../entitlements/test-sandbox-app-store.md).

| # | Cas | Attendu | Statut | Anomalie |
| --- | --- | --- | --- | --- |
| 11.1 | Ouvrir le paywall depuis une fonctionnalité verrouillée | Palier requis présélectionné et expliqué | | |
| 11.2 | Prix affichés | Prix réels du store, pas les prix marketing statiques | | |
| 11.3 | Achat sandbox complet | Palier débloqué, fonctionnalité accessible | | |
| 11.4 | Annuler la feuille d'achat Apple | Retour au paywall sans message d'erreur | | |
| 11.5 | « Restaurer mes achats » | Palier retrouvé, toast de confirmation | | |
| 11.6 | Restauration sans achat antérieur | Message clair, pas de crash | | |
| 11.7 | Palier reflété après redémarrage de l'app | Toujours correct (webhook appliqué côté serveur) | | |

**Contrôle de sécurité (COUR-39)** : après un achat, vérifier qu'aucun écran ne permet de modifier son propre palier autrement que par un achat réel. Le serveur ignore désormais toute écriture cliente sur ce champ ; si l'UI laissait croire le contraire, c'est une anomalie de cohérence à signaler.

---

## 4. Permissions, notifications et réseau

Critère « Les permissions, notifications et changements réseau sont testés ».

### 4.1 Permissions

| # | Cas | Attendu | Statut | Anomalie |
| --- | --- | --- | --- | --- |
| 12.1 | Première demande de notifications | Message système reprenant `NSUserNotificationsUsageDescription` (« Coursia vous envoie des rappels de planification et des alertes de promotions. ») | | |
| 12.2 | **Refuser** les notifications | L'app reste pleinement utilisable, aucun blocage ni boucle de demande | | |
| 12.3 | Refuser puis réactiver dans Réglages iOS | L'app tient compte du nouvel état sans réinstallation | | |
| 12.4 | Sign in with Apple | Aucune permission superflue demandée (pas de caméra, photos, localisation) | | |

### 4.2 Notifications

Templates dans `lib/notifications.ts` (rappel planning et rappel courses, hebdomadaires).

| # | Cas | Attendu | Statut | Anomalie |
| --- | --- | --- | --- | --- |
| 13.1 | Accepter les notifications | Rappels planifiés (vérifiable via Réglages → Notifications → Coursia) | | |
| 13.2 | Réception d'un rappel planning | Titre « Ta semaine commence ! », texte en français correct | | |
| 13.3 | Réception d'un rappel courses | Titre « Ta liste de courses t'attend » | | |
| 13.4 | Tap sur une notification, app fermée | Ouvre l'app sur un écran pertinent, pas un écran blanc | | |
| 13.5 | Tap sur une notification, app en arrière-plan | Idem | | |
| 13.6 | Désactiver les notifications dans le profil | Plus aucun rappel programmé | | |

### 4.3 Changements réseau

`hooks/useNetworkStatus.ts` et `hooks/useCoursesSync.ts` (liste de courses offline-first).

| # | Cas | Attendu | Statut | Anomalie |
| --- | --- | --- | --- | --- |
| 14.1 | Activer le mode Avion sur l'accueil | Bandeau hors-ligne affiché, pas de crash | | |
| 14.2 | Cocher des articles hors-ligne | Modifications conservées localement | | |
| 14.3 | Repasser en ligne | Synchronisation des articles cochés, sans doublon ni perte | | |
| 14.4 | Modifier la même liste hors-ligne sur deux appareils puis reconnecter | Résolution cohérente, aucune donnée silencieusement écrasée | | |
| 14.5 | Chargement des recettes hors-ligne | Message d'erreur explicite + bouton « Réessayer » fonctionnel au retour du réseau | | |
| 14.6 | Réseau très lent (Réglages → Développeur → Network Link Conditioner) | Skeletons affichés, pas de gel de l'interface | | |
| 14.7 | Coupure réseau **pendant** un achat | Pas de double débit ni d'état incohérent | | |
| 14.8 | Palier d'abonnement hors-ligne | Règle de grâce appliquée (COUR-33), l'utilisateur payant n'est pas rétrogradé à tort | | |
| 14.9 | Bascule Wi-Fi → 4G en cours d'utilisation | Aucune déconnexion ni perte de données | | |

---

## 5. Bilan et signature

### 5.1 Synthèse

| Indicateur | Valeur |
| --- | --- |
| Cas testés | / 90 |
| ✅ Conformes | |
| ❌ Anomalies | |
| ⏭️ Non testables | |
| Dont **bloquantes** | |

### 5.2 Anomalies ouvertes

| Ticket | Titre | Sévérité | Bloquant pour la release ? |
| --- | --- | --- | --- |
| | | | |

### 5.3 Décision

Critère d'acceptation : « La build candidate ne contient aucun bug bloquant ouvert. »

- [ ] **Build validée** — aucune anomalie bloquante ouverte, la candidate peut partir en review App Store.
- [ ] **Build rejetée** — au moins une anomalie bloquante ouverte (les lister en §5.2). Une nouvelle recette est requise après correction.

### 5.4 Signature

| | |
| --- | --- |
| Testeur (nom) | |
| Date de fin de recette | |
| Build recettée (version + buildNumber) | |
| Signature | |

> Joindre à COUR-40 : ce document complété, les captures/vidéos de chaque anomalie, et la liste des tickets Bug créés.
