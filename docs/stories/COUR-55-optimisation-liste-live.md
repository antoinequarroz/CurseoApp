# COUR-55 — Optimiser toute la liste avec les prix suisses live

## Story

En tant qu'utilisateur CoursIA abonné Standard+, je veux saisir mon NPA et
comparer toute ma liste de courses afin d'obtenir un parcours simple par
enseigne, un total indicatif et la liste des articles non trouvés.

## Critères d'acceptation

- seuls les articles non cochés sont envoyés, dans une limite de 40 articles ;
- le NPA suisse à quatre chiffres est obligatoire ;
- les enseignes favorites compatibles sont utilisées, sans dépasser cinq ;
- les modes équilibre, prix minimum, premium et bio ont une stratégie explicite ;
- le mode santé n'est pas présenté tant qu'aucun score nutritionnel fiable
  n'est disponible ;
- le résultat montre le total, chaque arrêt, les produits retenus et les
  articles non trouvés ;
- une économie n'est affichée que si elle peut être comparée au meilleur
  panier complet dans une seule enseigne ;
- les prix et disponibilités sont clairement présentés comme indicatifs ;
- le panier simulé historique est masqué lorsque le live est actif afin de ne
  pas mélanger montants fictifs et montants remontés par les enseignes ;
- l'Edge Function exige une session Supabase et un abonnement Standard+ ;
- le débit est limité à 12 optimisations par heure et par utilisateur ;
- aucune clé du gateway n'est exposée au client mobile ;
- la fonctionnalité reste désactivée en production tant que la licence
  commerciale AGPL et l'hébergement privé du gateway ne sont pas validés.

## Hors périmètre

- achat ou réservation auprès d'une enseigne ;
- garantie du prix, du stock ou de la disponibilité en magasin ;
- activation TestFlight ou production avant les prérequis juridiques et
  d'infrastructure.
