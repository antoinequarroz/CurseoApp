# QA COUR-109 à COUR-112

## Automatisé

- Manifeste complet accepté, URL/version/accord/capacités invalides refusés.
- Autorisation refusée, contexte incorrect, date invalide, expiration, durée excessive et jeton faible rejetés.
- Jeton absent de la sérialisation de l'adaptateur.
- Autorisation expirée bloquant tous les appels.
- Réponse prétendant transmettre une commande réelle rejetée.
- Kit de conformité vert sur le faux transport sandbox.
- Rapport no-go avec la liste des preuves manquantes.
- Rapport complet autorisant seulement la sandbox, jamais la production.
- Sandbox refusée par la politique du checkout public.

## Vérification partenaire future

À exécuter uniquement après réception d'une documentation et d'identifiants sandbox officiels :

1. renseigner un manifeste validé par le partenaire;
2. obtenir l'autorisation depuis un backend CoursIA authentifié;
3. exécuter le kit de conformité contre le transport officiel;
4. confirmer auprès de l'enseigne que les références restent dans son environnement de test;
5. révoquer l'autorisation et vérifier le refus immédiat;
6. faire valider les résultats par sécurité et juridique.

## Limite

Aucune API partenaire officielle ni aucun identifiant marchand n'est disponible dans le dépôt. Aucun appel réseau, déploiement Supabase ou build TestFlight n'est effectué pour ce lot.
