# COUR-65 — Validation

Date : 11 aout 2026

## Incident reproduit

- l'archive COUR-64 a ete telechargee puis sa somme externe verifiee ;
- le dechiffrement AES-256 et les trois sommes internes etaient valides ;
- la premiere restauration a echoue dans une transaction unique sur
  `storage.buckets_vectors` avec `permission denied` ;
- la transaction a ete integralement annulee, sans cible partiellement saine.

## Correctif et restauration locale

- `storage.buckets_vectors` et `storage.vector_indexes` sont maintenant exclus
  conformement au guide Supabase de backup/restore ;
- un nouveau dump de donnees production a ete genere localement avec ces
  exclusions ;
- restauration reussie dans une pile Supabase Postgres 17 isolee ;
- 48 tables publiques restaurees, toutes avec RLS ;
- 50 recettes, 3 profils et 3 comptes Auth verifies ;
- pile et donnees dechiffrees detruites apres le controle.

## Verification automatisee

- `scripts/verify-backup-restore.sh` controle integrite, transaction et
  invariants apres reprise ;
- le workflow `Supabase Backup Restore Drill` cible uniquement une sauvegarde
  verte de `main` ou un run choisi manuellement ;
- sauvegarde distante 31488558903 : verte sur `6cdd5a0`, artefact chiffre
  `coursia-supabase-backup-31488558903` de 54 161 octets ;
- restore drill 31488714280 : vert, declenche automatiquement depuis cette
  sauvegarde, avec destruction finale confirmee ;
- CI Courseo 31488549905 : jobs `quality` et `supabase-migrations` verts sur
  `6cdd5a0`.

## Limites

- les objets binaires Storage ne sont pas contenus dans le dump Postgres ;
- l'exercice valide une reprise logique dans une cible vierge, pas un basculement
  de production avec mesure complete du RTO ;
- les donnees sont dechiffrees uniquement sur un runner GitHub ephemere de
  confiance puis supprimees ; aucune copie en clair n'est conservee.
