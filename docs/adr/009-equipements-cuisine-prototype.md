# ADR 009 — Équipements de cuisine du prototype

## Statut

Accepté le 19 août 2026 dans COUR-70.

## Contexte

Le prototype doit personnaliser rapidement son catalogue avec huit équipements
stables. Il faut distinguer un ancien profil non renseigné d'une personne qui
a explicitement décoché toutes les options. Les besoins d'une recette sont
cumulatifs : une recette écrite pour un four et un mixeur exige les deux.

## Décision

- stocker `profils.equipements_cuisine` dans un tableau nullable ;
- interpréter `NULL` comme « non renseigné » et `[]` comme « aucun sélectionné » ;
- stocker `recettes.equipements_requis` dans un tableau non nullable, vide par défaut ;
- baliser explicitement les 50 recettes du catalogue à partir de leur clé externe ;
- utiliser une déduction textuelle prudente uniquement pour les contenus sans clé catalogue ;
- trier en douceur par compatibilité et réserver le masquage à un filtre volontaire ;
- considérer tous les équipements d'une recette comme nécessaires ensemble.

## Pourquoi des tableaux pour cette version

Le référentiel est petit, fermé et n'a pour l'instant ni attribut métier ni
alternative. Les tableaux évitent trois tables de jointure, des lectures
supplémentaires et de nouvelles surfaces RLS dans une application mobile en
phase prototype. Des contraintes SQL empêchent néanmoins tout code inconnu.

## Conséquences

- les profils existants continuent à voir tout le catalogue ;
- les réimports officiels retrouvent toujours le balisage audité ;
- une future variante « four ou air fryer » ne devra pas ajouter les deux
  codes au tableau : elle nécessitera des variantes de cuisson explicites ou
  un modèle normalisé de groupes alternatifs ;
- l'équipement ne doit jamais invalider un favori, un planning ou une liste
  de courses déjà enregistrés.

