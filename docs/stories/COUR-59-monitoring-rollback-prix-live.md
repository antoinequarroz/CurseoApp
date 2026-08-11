# COUR-59 — Monitoring et rollback des prix live

## Story

En tant qu'équipe CoursIA, nous voulons détecter une indisponibilité durable du
gateway et arrêter les appels live sans nouvelle build mobile afin que les
utilisateurs retrouvent immédiatement le catalogue fiable plutôt qu'une suite
d'erreurs fournisseur.

## Critères d'acceptation

- chaque transition du coupe-circuit produit un événement JSON sans donnée
  utilisateur, produit ou liste de courses ;
- une panne de journalisation ne modifie jamais le comportement du circuit ;
- la readiness du staging peut être vérifiée toutes les cinq minutes ;
- la surveillance reste inactive tant que la variable GitHub
  `SWISS_GROCERIES_MONITORING_ENABLED` ne vaut pas `true` ;
- la surveillance utilise un Environment opérationnel séparé, sans droit de
  déploiement Google Cloud ;
- quatre sondes espacées absorbent un démarrage à froid ou une panne transitoire ;
- après quatre échecs, `SWISS_GROCERIES_SERVER_ENABLED=false` est appliqué au
  projet Supabase de staging et le workflow termine en erreur visible ;
- un workflow manuel permet le même arrêt d'urgence après saisie de
  `DESACTIVER` ;
- ni la surveillance ni le rollback ne peuvent activer le service ;
- les déploiements, sondes et rollbacks partagent le même verrou de concurrence.

## Hors périmètre

- activation du staging ou du flag mobile ;
- notification Slack, e-mail ou PagerDuty ;
- monitoring de production ;
- restauration automatique après une panne ;
- déploiement distant avant validation de la licence.
