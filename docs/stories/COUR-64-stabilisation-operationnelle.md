# COUR-64 — Stabilisation operationnelle de la beta

## Story

En tant qu'equipe coursIA, nous voulons fiabiliser les sauvegardes, l'observabilite
et l'exploitation du prototype pendant la recette TestFlight, afin de corriger
les incidents sans modifier l'experience que les testeurs evaluent.

## Criteres d'acceptation

- la sauvegarde planifiee exporte le schema, les donnees applicatives et les
  roles via Supabase CLI sans mot de passe de base persistant ;
- aucun dump en clair n'est publie comme artefact du depot public ;
- l'archive est chiffree en AES-256 avant son envoi et sa somme SHA-256 est
  conservee avec elle ;
- le workflow echoue explicitement si un secret manque ou si un export est vide ;
- une procedure documentee permet de controler et restaurer une archive ;
- l'etat Sentry de la build 19 est consulte avec un jeton strictement en lecture,
  ou le jeton manquant est consigne comme blocage sans contourner la securite ;
- la demonstration SwissGroceries reste limitee a la cohorte serveur, dispose
  d'une procedure d'arret et n'est jamais presentee comme une production ;
- les avertissements de tests provoques par des mises a jour React hors `act`
  sont corriges sans masquer globalement `console.error` ;
- la Definition of Done du depot est rejouee avant publication.

## Hors perimetre

- changement visuel avant les retours de la build 19 ;
- ouverture generale de SwissGroceries ;
- achat d'une licence ou d'une infrastructure cloud ;
- activation de PITR Supabase ;
- correction des bugs fonctionnels qui seront classes dans COUR-63.
