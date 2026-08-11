# COUR-54 — Swipe fluide et prix suisses live

## Story

En tant qu'utilisateur CoursIA, je veux parcourir les recettes sans latence et
consulter, lorsqu'un produit manque au catalogue interne, des prix indicatifs
issus d'enseignes suisses, afin de préparer ma semaine sans rupture de rythme.

## Critères d'acceptation

- le changement de recette n'attend jamais l'ecriture du swipe sur Supabase ;
- un geste rapide est accepte meme s'il ne parcourt pas toute la distance ;
- un mouvement vertical ne declenche pas accidentellement un swipe ;
- l'image suivante est prechargee et la preference systeme de reduction des
  animations est respectee ;
- aucune recette n'est sautee dans le deck des gouts ;
- le catalogue Supabase reste prioritaire ; le live n'est qu'un fallback ;
- le mobile ne contient aucune cle gateway et ne contacte aucune enseigne ;
- seuls les comptes Standard+ authentifies peuvent interroger le proxy ;
- le live est desactive par defaut et limite a 60 recherches/heure/utilisateur ;
- l'activation production attend la validation de licence et l'hebergement du
  gateway documentes dans ADR-007.

## Hors périmètre

- garantie de prix ou de stock en magasin ;
- fusion automatique des resultats MCP dans `prix_courant` ;
- activation TestFlight/production avant validation juridique et monitoring.
