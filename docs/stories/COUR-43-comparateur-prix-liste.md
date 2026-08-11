# COUR-43 - Comparateur de prix depuis la liste de courses

## User story

En tant qu'utilisateur Standard ou superieur, je veux ouvrir la comparaison
des prix d'un article afin d'identifier l'enseigne la plus avantageuse et de
connaitre la fraicheur des donnees.

## Criteres d'acceptation

- Aucun appel prix n'est declenche avant une action explicite.
- Un utilisateur Gratuit ouvre le paywall Standard sans requete prix.
- Un utilisateur Standard peut ouvrir et refermer un article.
- Les offres sont triees par prix unitaire croissant.
- Enseigne, format, prix, prix unitaire, source et date sont visibles.
- Toutes les offres ex aequo au minimum portent le badge "Meilleur prix".
- Un prix expire est signale sans ambiguite.
- Produit inconnu et produit sans prix sont deux etats distincts.
- Une erreur propose de reessayer.
- Hors ligne, la liste reste utilisable et le comparateur explique sa limite.
- Les controles possedent role, libelle et etat d'accessibilite.
- Les montants du panier mocke sont presentes comme une simulation indicative.

## Hors perimetre

- Optimisation multi-enseignes complete avec prix reels.
- Pipeline de collecte automatise.
- Cache persistant des prix.
- Recherche semantique et alias produits.
- Commande reelle chez une enseigne.

## Verification

- Tests du gating, du chargement a la demande et des etats de donnees.
- Non-regression du cochage et de la suppression des articles.
- Test avec donnees Supabase locales apres `supabase db reset`.
- Test appareil/simulateur en ligne puis hors ligne.
