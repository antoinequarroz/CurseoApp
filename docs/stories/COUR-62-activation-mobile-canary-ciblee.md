# COUR-62 — Activation mobile canary ciblée

## Story

En tant qu'équipe CoursIA, nous voulons distribuer un binaire capable d'afficher
l'optimisation SwissGroceries uniquement aux comptes autorisés par le serveur,
afin de tester le canary sur appareil sans exposer la fonctionnalité aux autres
utilisateurs.

## Critères d'acceptation

- le flag Expo autorise seulement la demande d'éligibilité ; il n'accorde jamais
  l'accès à lui seul ;
- l'Edge Function détermine l'éligibilité à partir de l'UUID Supabase Auth, du
  palier vérifié en base et du mode serveur `off | canary | on` ;
- la réponse d'éligibilité est un booléen et ne révèle ni la cohorte, ni le
  palier, ni le motif d'un refus ;
- un compte Gratuit, un compte Standard+ hors cohorte et tout compte lorsque le
  serveur est `off` conservent exactement l'expérience de simulation ;
- un compte Standard+ autorisé voit la carte d'optimisation existante, marquée
  « En test », sans récapitulatif de panier simulé contradictoire ;
- l'éligibilité est mise en cache au maximum cinq minutes et sa clé contient
  l'identifiant du profil pour éviter toute fuite lors d'un changement de
  compte ;
- un échec réseau, une ancienne Edge Function ou une réponse invalide ferme
  silencieusement l'accès côté mobile ;
- les profils `preview` et `production` embarquent la capacité de demander
  l'éligibilité, mais le mode serveur reste l'autorité et demeure fermé tant que
  la licence SwissGroceries n'est pas approuvée.

## Hors périmètre

- activation distante du canary ou du mode général `on` ;
- déploiement de l'Edge Function, du gateway ou publication TestFlight ;
- validation commerciale ou juridique de la source SwissGroceries ;
- modification visuelle du parcours de simulation existant.
