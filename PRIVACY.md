# Politique de confidentialité — Courseo

Dernière mise à jour : à compléter à la date de lancement.

## Qui sommes-nous

Courseo est exploité par [Nom / Raison sociale], Suisse. Contact vie privée : privacy@courseo.ch

## Données collectées

| Donnée | Finalité | Base légale |
|---|---|---|
| Prénom, composition du foyer | Personnalisation du planning | Exécution du contrat |
| Budget hebdomadaire | Suivi budgétaire, alertes | Exécution du contrat |
| Régimes, allergies, objectifs santé | Filtrage des recettes (donnée de santé au sens nLPD) | Consentement explicite (onboarding) |
| Enseignes favorites | Comparateur de prix | Exécution du contrat |
| Historique de swipes | Recommandations personnalisées | Intérêt légitime |
| Historique de commandes | Calcul des économies, statistiques | Exécution du contrat |
| Identifiant utilisateur (UUID) | Authentification | Exécution du contrat |
| Données d'usage (PostHog) | Amélioration produit | Consentement (opt-out possible) |
| Rapports de crash (Sentry) | Stabilité de l'application | Intérêt légitime |

Courseo ne collecte **jamais** de coordonnées bancaires (paiements gérés par Apple/Google) ni de données de localisation précise.

## Durée de rétention

- Données de profil : conservées tant que le compte est actif, supprimées (anonymisées) dans les 30 jours suivant une demande de suppression
- Historique de commandes : conservé 24 mois à des fins statistiques agrégées, sans lien identifiable après suppression du compte
- Logs techniques (Sentry) : 90 jours

## Droits de l'utilisateur (nLPD)

Conformément à la nouvelle Loi fédérale sur la protection des données (nLPD, Suisse) :

- **Droit d'accès** : demander une copie de vos données via l'écran Profil ou privacy@courseo.ch
- **Droit de rectification** : modifiable directement dans l'écran Profil
- **Droit à l'effacement** : bouton "Supprimer mon compte" dans le Profil (confirmation en 2 étapes) — voir `supabase/functions/delete-account`
- **Droit à la portabilité** : export des données sur demande, format JSON

## Partage des données

Aucune donnée personnelle n'est vendue. Sous-traitants utilisés :

- **Supabase** (hébergement base de données, UE)
- **RevenueCat** (gestion des abonnements, ne voit pas les données de profil)
- **PostHog** (analytics, hébergement UE, RGPD-friendly)
- **Sentry** (rapports de crash)
- **Resend** (emails transactionnels)

## Contact

Pour toute question relative à cette politique : privacy@courseo.ch
