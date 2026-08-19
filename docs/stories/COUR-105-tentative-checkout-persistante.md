# COUR-105 — Persister une tentative de checkout

## Objectif

Retrouver un état de reprise fiable après une fermeture ou une interruption de l'application.

## Critères d'acceptation

- Le brouillon conserve l'identifiant, le début et le statut de la dernière tentative.
- `paiementEnCours` reste transitoire et revient à `false` après redémarrage.
- Une tentative restée `en_cours` est présentée comme interrompue, jamais comme confirmée.
- Une nouvelle tentative remplace proprement l'ancienne et conserve les clés d'idempotence du brouillon.
- Une réussite ou un échec enregistre une heure de fin.
