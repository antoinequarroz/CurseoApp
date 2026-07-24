# Qualité des prix (COUR-21)

Ce document décrit la stratégie de correction/traitement mise en place pour éviter de présenter des prix anciens ou invérifiables comme actuels.

## Durée de validité par source

Table `regles_fraicheur_prix` :

| source          | durée de validité | pourquoi                                                                                     |
|-----------------|--------------------|-----------------------------------------------------------------------------------------------|
| `api_enseigne`  | 3 jours            | API officielle : prix censé être à jour en temps quasi réel, suspect très vite si ancien.     |
| `scraping`      | 14 jours           | Aligné sur le cycle de promo hebdomadaire habituel en Suisse.                                  |
| `saisie_manuelle` | 30 jours         | Vérifiée par un humain au moment de la collecte, mais rarement remise à jour.                  |

Ces durées sont des données (pas du code en dur) : ajustables sans migration de schéma, juste un `update` sur `regles_fraicheur_prix`.

## Prix expiré : jamais silencieux

La vue `prix_courant` calcule `expire` côté base à partir de `collecte_le` et de la règle de fraîcheur de la source. Un prix expiré :
- reste affiché (on ne le fait pas disparaître : c'est la seule donnée disponible),
- mais est signalé explicitement dans l'UI (`ComparateurPrix.tsx`, badge "peut-être dépassé").

Le seuil n'est calculé qu'à un seul endroit (la vue). Le client ne recalcule jamais de seuil lui-même, pour éviter toute divergence entre seuil serveur et seuil affiché.

## Doublons exacts : rejetés à l'insertion

Contrainte `unique (offre_id, collecte_le)` sur `prix_historique`. Un doublon exact (même offre, même timestamp de collecte) ne peut pas exister : la pipeline de collecte doit gérer l'erreur d'insertion, ce n'est jamais un cas silencieusement ignoré (pas de `on conflict do nothing`).

## Doublons suspects (même jour, même offre, prix différents ou timestamps différents)

Vue `prix_doublons_suspects` : regroupe par offre/prix/jour et remonte les cas avec plus d'une observation. Sert de base à une revue humaine périodique — n'est jamais bloquant, juste un signal.

## Variations extrêmes

Vue `prix_anomalies` : compare chaque observation à la précédente pour la même offre (`lag()` sur `collecte_le`) et marque `variation_extreme = true` si l'écart relatif dépasse 50 %. C'est un signal pour revue humaine, jamais une correction ou un rejet automatique — une vraie promotion ou un vrai changement de prix peut légitimement dépasser ce seuil.

## Couverture et âge des prix par enseigne

Vue `rapport_fraicheur_prix_par_enseigne` : par enseigne, nombre d'offres, nombre d'offres avec un prix connu, nombre d'offres expirées, âge moyen et âge max des prix courants. Permet de suivre la santé de la collecte par enseigne dans le temps.

## Vérification

`scripts/verify-qualite-prix.sh` reproduit le scénario du ticket : injecte un prix périmé (sur une offre de test dédiée, pour ne pas être masqué par une observation plus récente déjà en base) et un prix avec une variation extrême, puis vérifie qu'ils sont bien signalés (`expire=true`, `variation_extreme=true`), qu'un doublon exact est rejeté (HTTP 409), et que le rapport de couverture répond.
