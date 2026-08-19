# COUR-96 — Reprendre les erreurs et annuler globalement

## Objectif

Éviter qu'une panne temporaire ou un échec d'enseigne produise une validation incohérente.

## Livré

- Deux tentatives par défaut, trois maximum.
- Reprise uniquement pour réseau, timeout, rate limit et erreur temporaire.
- Échecs permanents non répétés.
- États `pret`, `partiel`, `indisponible`, `erreur_temporaire`, `annule`.
- Si une enseigne échoue, tous les paniers déjà préparés sont annulés et aucun paiement n'est possible.
