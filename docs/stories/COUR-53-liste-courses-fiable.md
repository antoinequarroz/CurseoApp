# COUR-53 — Liste de courses fiable hors ligne

## Story

En tant que personne qui fait ses courses avec une connexion irrégulière, je
veux pouvoir cocher, ajouter et supprimer des articles sans perdre ma liste,
afin de continuer simplement dans le magasin puis de retrouver mes changements
en ligne.

## Réalisé

- La liste locale persistée reste la source de vérité pendant une coupure.
- La dernière liste Supabase est restaurée sur une installation sans données
  locales.
- Une modification locale faite pendant un chargement distant reste prioritaire.
- Une modification faite pendant un envoi déclenche un second envoi au lieu
  d'être marquée à tort comme synchronisée.
- La suppression du dernier article propage bien une liste vide au serveur.
- Une réponse réseau reçue après déconnexion est ignorée pour protéger le
  compte suivant sur un appareil partagé.
- Un statut compact indique la sauvegarde locale ou distante et propose
  « Réessayer » après un échec, sans bloquer la liste.

## Critères d'acceptation

- [x] Ajouter, cocher et supprimer restent instantanés hors ligne.
- [x] Une liste vide peut remplacer la liste distante existante.
- [x] Aucune mutation concurrente n'est perdue pendant une synchronisation.
- [x] Une liste distante ne remplace jamais une action locale plus récente.
- [x] La déconnexion invalide les requêtes de l'ancien compte encore en vol.
- [x] L'erreur explique que la liste reste disponible et offre une reprise.
- [x] Le bouton de reprise possède un nom accessible et une cible tactile de
  44 points.
- [ ] Vérifier le parcours en mode avion puis au retour du réseau sur appareil.

## Recette appareil

1. Générer une liste, activer le mode avion puis cocher et supprimer plusieurs
   articles, y compris le dernier.
2. Fermer et rouvrir l'application : la liste locale doit être identique.
3. Revenir en ligne et attendre la disparition du statut d'enregistrement.
4. Se connecter sur un second appareil et vérifier la liste restaurée.
5. Simuler un échec réseau, utiliser « Réessayer », puis se déconnecter pendant
   un nouvel envoi pour vérifier l'absence de données de l'ancien compte.
