# COUR-44 — Première passe graphique de l'accueil

## Objectif

Donner à l'accueil CoursIA une hiérarchie plus nette et une finition compatible avec un prototype Store, sans remplacer l'identité visuelle existante.

## Réalisé

- Le CTA principal suit immédiatement le planning de la semaine.
- La salutation devient plus directe et repose sur une surface chaude dédiée.
- La typographie partagée gagne une échelle, des interlignes et des chiffres tabulaires cohérents.
- Les boutons et cartes utilisent des rayons continus, une profondeur plus sobre et un retour tactile `0.96`.
- Les cibles tactiles de l'accueil sont agrandies et leurs états accessibles sont exposés.
- Les actions « Voir la recette » et « Favori » ne sont plus imbriquées.
- L'aperçu web dispose d'un stockage adapté à sa plateforme.

## Critères d'acceptation

- [x] Le CTA principal est visible dans le premier parcours de lecture.
- [x] Le rendu tient dans un viewport mobile de 390 × 844 sans contrôle inaccessible.
- [x] Chaque favori est un contrôle distinct et nommé.
- [x] Le thème sombre conserve la palette CoursIA et une hiérarchie lisible.
- [x] TypeScript, lint, tests, Expo Doctor et bundle Android passent.
- [ ] Valider le thème clair sur appareil ou simulateur.
- [ ] Valider VoiceOver et TalkBack sur appareil ou simulateur.
- [ ] Valider un petit iPhone et un grand Android avant de clore la story selon COUR-36.
