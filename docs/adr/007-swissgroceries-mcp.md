# ADR-007 — SwissGroceries MCP comme source live optionnelle

## Statut

Prototype local accepté ; workflow de staging Cloud Run Zürich prêt mais non
exécuté. Activation et déploiement distant restent en attente de validation de
licence et des ressources cloud (COUR-58).

## Decision

Le catalogue `prix_courant` Supabase reste la source prioritaire. Le flag
`SWISS_GROCERIES_ENABLED=true` autorise uniquement le mobile à demander son
éligibilité à une Edge Function authentifiée. Le serveur accorde ensuite
l'accès selon le palier, son mode et la cohorte ; le flag du binaire n'est
jamais une autorisation. L'Edge transmet les requêtes admises au gateway Node
privé, seul composant autorisé à exécuter le serveur MCP.

Le mobile ne contacte jamais directement les APIs d'enseignes et ne contient
ni cle gateway ni dependance MCP. Les resultats live ne sont pas fusionnes avec
les observations du catalogue afin d'eviter des dates et methodes de collecte
contradictoires dans un meme tableau.

## Raisons

- le serveur MCP est un processus Node/stdio, incompatible tel quel avec le
  runtime Deno d'une Edge Function ;
- les endpoints enseignes sont non officiels et peuvent changer ;
- la version maintenue est AGPL-3.0-only et propose une licence commerciale ;
- le flag Expo embarque la capacité canary dans une build, tandis que le
  coupe-circuit Edge `SWISS_GROCERIES_SERVER_MODE` reste l'unique autorité et
  permet un arrêt immédiat ou une ouverture ciblée sans nouvelle version mobile
  (COUR-62) ;
- le flag serveur historique reste à `false` pendant le canary afin qu'une
  ancienne révision Edge reste fermée en cas de rollback (COUR-61).

## Décision de déploiement progressif

Le mode serveur est `off`, `canary` ou `on`. Une valeur absente ou invalide est
interprétée comme `off`; la compatibilité avec
`SWISS_GROCERIES_SERVER_ENABLED=true` ne s'applique que si le nouveau mode est
absent. En `canary`, l'Edge Function compare l'UUID vérifié par Supabase Auth à
une liste secrète de dix comptes maximum. Les métadonnées client, le profil et
les paramètres de requête ne peuvent jamais accorder cet accès.

L'action `eligibility` retourne uniquement `{ eligible: boolean }`. Elle ne
révèle jamais l'existence de la cohorte ni la raison d'un refus. Le mobile met
ce résultat en cache cinq minutes avec l'UUID du profil dans la clé ; toute
erreur ou réponse ambiguë revient à l'expérience standard.

## Conditions avant production

1. ⏳ accord/licence commerciale documenté ;
2. 🟡 image, health checks, logs et coupe-circuit prêts (COUR-57) ; workflow
   Cloud Run Zürich, secret géré et limites de coût prêts (COUR-58), exécution
   distante et monitoring encore en attente ;
3. 🟡 Edge Function testée localement ; déploiement et test production en attente ;
4. ✅ source, heure de collecte et nature indicative du prix affichées (COUR-56) ;
5. ✅ panne du gateway et repli propre au catalogue prouvés localement (COUR-56).
