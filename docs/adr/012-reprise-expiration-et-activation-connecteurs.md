# ADR-012 — Reprise, expiration et activation des connecteurs

## Statut

Accepté pour le prototype.

## Décision

Le checkout conserve une atomicité produit : si une enseigne échoue, toutes les préparations déjà réussies sont annulées. L'utilisateur peut relancer l'ensemble avec les mêmes clés d'idempotence. Le brouillon expire après 30 minutes et doit alors être actualisé.

Les connecteurs sont fermés par défaut. Le simulateur peut être ouvert explicitement uniquement s'il ne sait ni payer ni transmettre. Un futur canary marchand exigera une conformité automatisée et une autorisation fournie par le serveur; l'application cliente ne pourra pas l'activer seule.

## Conséquences

- Une reprise ne peut pas produire silencieusement une commande partielle.
- Les prix et créneaux trop anciens ne sont pas validés.
- Le contrat peut être testé avant l'accès aux API officielles.
- Une véritable activation marchande nécessitera une décision serveur et un dispositif opérationnel distinct.
