# COUR-64 — Validation

Date : 11 aout 2026

## Sauvegarde Supabase

- cause historique confirmee dans GitHub Actions : `DATABASE_URL` etait vide ;
- export passwordless teste localement avec Supabase CLI 2.113.0 ;
- schema, donnees et roles verifies non vides avant archivage ;
- chiffrement GPG AES-256 obligatoire avant l'upload ;
- secrets `SUPABASE_ACCESS_TOKEN` et `BACKUP_ENCRYPTION_PASSPHRASE` crees dans
  GitHub Actions sans afficher leurs valeurs ;
- copie de recuperation de la phrase stockee dans la variable utilisateur
  Windows `COURSIA_BACKUP_PASSPHRASE` ;
- workflow distant `Daily Supabase Backup` 31486168798 : vert sur la revision
  `34ed0ae`, avec l'artefact chiffre
  `coursia-supabase-backup-31486168798` (54 234 octets), expire le 10 septembre 2026.

## Sentry build 19

- initialisation du SDK, filtrage des donnees personnelles, environnement et
  desactivation des traces verifies dans le code et par tests unitaires ;
- aucune lecture d'evenements n'a ete effectuee : aucun
  `SENTRY_AUTH_TOKEN` en lecture seule n'est present sur le poste ;
- aucun contournement par DSN client ou navigateur n'a ete utilise.

## Demonstration SwissGroceries

- endpoint temporaire `/readyz` : HTTP 200 le 11 aout 2026 ;
- tunnel Docker `coursia-cour62-tunnel` actif pendant le controle ;
- secrets serveur d'URL, Bearer, mode et cohorte presents dans Supabase ;
- exploitation, limites de licence et arret immediat documentes dans
  `docs/runbooks/testflight-prix-demo.md` ;
- aucun passage general au mode `on` et aucun deploiement cloud durable.

## Verification locale

- `npm run type-check` : vert ;
- `npm run lint` : vert ;
- Jest : 44 suites, 265 tests verts ;
- gateway : 26 tests verts ;
- reset Supabase complet sur pile isolee : migrations et seed verts ;
- GitHub Actions `CI Courseo` 31486157731 : vert sur la revision `34ed0ae` ;
- job `quality` : lint, types, couverture Jest, gateway et image Docker verts ;
- job `supabase-migrations` : migrations, seed, RLS, cohorte canary et parcours
  critiques a deux utilisateurs verts.

## Limites

- la consultation des erreurs Sentry reste bloquee par le jeton de lecture
  absent ;
- l'endpoint SwissGroceries demeure une demonstration temporaire dependant du
  poste local et d'une licence non validee pour la production ;
- la restauration d'une archive doit encore etre exercee sur un projet
  Supabase vierge avant de qualifier le dispositif de sauvegarde restaure.
