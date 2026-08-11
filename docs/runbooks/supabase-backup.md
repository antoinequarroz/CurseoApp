# Runbook — sauvegarde Supabase chiffree

## Fonctionnement

Le workflow `Daily Supabase Backup` s'execute chaque jour a 02:00 UTC et peut
etre lance manuellement. Il utilise l'authentification temporaire du Supabase
CLI pour exporter trois fichiers :

- `schema.sql` pour le schema applicatif ;
- `data.sql` pour les donnees des schemas exportes par Supabase CLI ;
- `roles.sql` pour les roles personnalisables exportables.

Les fichiers sont controles, sommes en SHA-256, archives puis chiffres par GPG
en AES-256. Seuls le fichier `.gpg` et sa somme sont envoyes dans GitHub
Artifacts. Le depot etant public, aucun dump en clair ne doit etre ajoute aux
artefacts, aux logs ou a Git.

Les schemas geres par la plateforme, notamment certains elements internes
`auth` et `storage`, suivent les exclusions documentees du Supabase CLI. Les
objets binaires de Storage ne sont pas contenus dans une sauvegarde Postgres.
`storage.buckets_vectors` et `storage.vector_indexes` sont explicitement exclus
des donnees : Supabase les gere et refuse leur restauration logique avec le role
Postgres du projet.

Apres chaque sauvegarde verte sur `main`, le workflow
`Supabase Backup Restore Drill` telecharge uniquement l'artefact chiffre, le
dechiffre sur un runner GitHub ephemere, puis execute
`scripts/verify-backup-restore.sh` dans une pile Supabase vierge. Aucun dump en
clair ni log de donnees n'est conserve en artefact. La cible et les fichiers
dechiffres sont detruits meme en cas d'echec.

## Secrets GitHub

- `SUPABASE_ACCESS_TOKEN` : jeton de gestion necessaire au lien temporaire ;
- `BACKUP_ENCRYPTION_PASSPHRASE` : phrase aleatoire utilisee uniquement par GPG.

La copie de recuperation de la phrase est stockee sur le poste Windows du
proprietaire dans la variable utilisateur `COURSIA_BACKUP_PASSPHRASE`. Avant de
changer de poste, elle doit etre transferee dans un gestionnaire de secrets
externe approuve. GitHub ne permet pas de relire la valeur d'un secret Actions.

## Controle quotidien

1. ouvrir l'execution `Daily Supabase Backup` ;
2. verifier que les exports et le chiffrement sont verts ;
3. verifier que l'execution `Supabase Backup Restore Drill` associee est verte ;
4. si un controle manuel est requis, telecharger l'artefact et comparer sa
   somme :

```bash
sha256sum -c coursia-supabase-*.tar.gz.gpg.sha256
```

## Dechiffrement de recette

Ne jamais committer l'archive dechiffree. Sur un poste protege disposant de la
phrase de recuperation :

```powershell
gpg --batch --yes --pinentry-mode loopback `
  --passphrase $env:COURSIA_BACKUP_PASSPHRASE `
  --output coursia-supabase.tar.gz `
  --decrypt coursia-supabase-*.tar.gz.gpg
```

Extraire ensuite l'archive dans un dossier temporaire et verifier
`backup/SHA256SUMS`. Restaurer avec `scripts/verify-backup-restore.sh` dans une
pile Supabase vierge, jamais directement sur la production.

## Rotation ou incident

En cas d'exposition presumee, remplacer immediatement les deux secrets GitHub,
revoquer le jeton Supabase precedent et supprimer les artefacts concernes. Une
nouvelle phrase rend les anciennes archives illisibles sans l'ancienne valeur :
conserver les cles selon la meme duree que les sauvegardes correspondantes.
