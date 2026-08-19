# COUR-91 — Protocole appareil

## Prérequis

- build contenant COUR-91 ;
- compte Standard inclus dans le canary SwissGroceries ;
- gateway et tunnel HTTPS actifs ;
- liste comprenant un produit courant et un produit volontairement difficile à trouver.

## Parcours principal

1. Ouvrir **Courses**, saisir un NPA suisse et lancer l'optimisation.
2. Vérifier que les articles initialement absents sont recherchés de nouveau sans
   ouvrir d'écran de sélection.
3. Ouvrir les paniers préparés.
4. Vérifier la présence du badge **Choisi automatiquement**.
5. Vérifier l'absence des actions **Changer** et **Confirmer ce produit**.
6. Vérifier que **Choisir l'adresse et la livraison** est disponible dès que les
   quantités couvrent les besoins.

## Cas limites

- variante contradictoire : « lait entier » ne doit pas sélectionner « lait
  écrémé » automatiquement ;
- option mono-enseigne : la relance ne doit pas ajouter une seconde enseigne ;
- aucun équivalent fiable : afficher **Indisponible en ligne**, sans demander un
  choix manuel et sans inventer de prix ;
- erreur réseau pendant la relance : conserver le résultat initial et l'article
  dans la liste des indisponibles ;
- vérifier VoiceOver/TalkBack, grandes tailles de texte, petit iPhone et grand
  Android.

## Limite de cette livraison

Le contrôle appareil n'a pas été exécuté dans cette tâche : aucune nouvelle
build TestFlight n'a été demandée. Il doit être réalisé avec la prochaine
release groupée avant de fermer définitivement le ticket.
