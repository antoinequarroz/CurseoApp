# COUR-52 — Parcours principal automatisé

## Story

En tant qu'équipe produit, nous voulons vérifier la boucle de valeur complète
avant chaque diffusion, afin de détecter une régression avant TestFlight.

## Couverture

Le flow `.maestro/parcours-principal.yaml` exécute avec un compte de test déjà
onboardé : connexion → profil → favori → planning midi/soir → liste de courses.
Les sélecteurs sont des identifiants d'accessibilité stables, pas des coordonnées.

## Critères d'acceptation

- [x] Le scénario et ses variables secrètes d'exécution sont documentés.
- [x] Le même flow cible iOS et Android grâce à `APP_ID`.
- [x] L'outil Maestro est installé localement et le YAML est accepté par la CLI.
- [ ] Le flow passe sur un Android API 34 ou équivalent avec un compte de recette.
- [ ] Le flow passe sur un petit iPhone et un grand iPhone.

Les deux dernières cases exigent respectivement un émulateur Android démarré
avec l'application installée et un runner macOS/Maestro Cloud avec les secrets
du compte de recette. Elles ne doivent jamais être cochées sur une simple
validation statique.

