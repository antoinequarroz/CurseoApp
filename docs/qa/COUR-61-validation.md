# COUR-61 — Rapport de validation

## Portée livrée

- garde Edge `off | canary | on`, fermée par défaut ;
- cohorte secrète limitée à dix UUID Supabase Auth ;
- workflow manuel d'activation avec quatre validations indépendantes ;
- rollback manuel et automatique compatible avec les anciennes révisions ;
- tests unitaires de décision, tests statiques des workflows et vérification
  locale avec deux vrais comptes Auth.

## Validation locale exécutée

- `npx supabase db reset` : vert après rejeu complet des 50 migrations et du
  seed final ;
- `scripts/verify-swissgroceries-canary.sh` : vert avec JWT GoTrue réels —
  Gratuit allowlisté refusé en 403, Standard allowlisté admis par la garde,
  Standard hors cohorte refusé en 503 ;
- le reset a révélé puis corrigé le compte de seed incomplet : son identité
  email et ses tokens vides sont désormais compatibles avec GoTrue ;
- `npm --prefix services/swissgroceries-gateway test` : 26/26 tests verts ;
- YAML lint des quatre workflows de déploiement/activation/rollback : vert ;
- `npx tsc --noEmit` : vert ;
- `npm run lint` : vert, aucun warning ;
- `npm test -- --coverage --runInBand` : 43 suites, 257 tests, tous verts.

La suite Jest conserve ses avertissements historiques Supabase non configuré,
`act(...)` et worker forcé à quitter, mais termine avec le code 0. Aucun test
sur appareil n'est requis : COUR-61 ne modifie aucun écran ni bundle mobile.

`supabase/config.toml` conserve le `verify_jwt=true` par défaut pour
`swissgroceries`; le mode d'authentification n'est pas assoupli.

## Limites explicites

L'Edge Function et les workflows ne sont pas déployés à distance tant que la
licence SwissGroceries n'est pas approuvée. La CI distante ne peut être déclarée
verte avant un push, qui n'entre pas dans le périmètre de ce ticket.
