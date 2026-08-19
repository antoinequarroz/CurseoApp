# ADR-013 — Sandbox partenaire fermée

## Statut

Accepté pour la préparation du prototype.

## Décision

Une future API officielle est intégrée d'abord comme un environnement `sandbox` distinct de `simulation` et de `marchand`. Le checkout public ne reconnaît que le simulateur local et refuse donc automatiquement cet adaptateur.

L'adaptateur sandbox exige :

1. un manifeste HTTPS associé à un accord partenaire;
2. une autorisation serveur opaque de 15 minutes maximum;
3. le passage du kit de conformité;
4. des validations sécurité et juridique explicites.

Le jeton n'est jamais persisté et reste dans un champ privé non sérialisable. Même lorsque tous les contrôles sont verts, la décision produite concerne uniquement la sandbox; la production demeure fermée.

## Conséquences

- Aucun test ne peut modifier un panier réel par confusion de mode.
- L'arrivée d'une API Migros ou Coop nécessitera un transport dédié mais pas une refonte du contrat.
- Une activation réelle exigera une autorité serveur, une authentification partenaire, des webhooks et une nouvelle ADR.
