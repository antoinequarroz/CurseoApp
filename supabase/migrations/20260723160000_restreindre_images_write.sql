-- COUR-9 (suite) : corrige une divergence de securite trouvee en versionnant
-- le schema. La policy "images_write" deployee en production n'avait aucune
-- restriction (n'importe quel role pouvait uploader dans le bucket public
-- "images"), alors que l'ancien supabase/schema.sql prevoyait une
-- restriction par dossier utilisateur — perdue en route, probablement par
-- inadvertance. lib/uploadImage.ts uploade toujours vers
-- recettes/{userId}/{fichier}, donc (storage.foldername(name))[2] = l'ID de
-- l'utilisateur : cette policy ne casse pas le flux d'upload existant.

drop policy if exists images_write on storage.objects;
create policy images_write on storage.objects for insert
  with check (
    bucket_id = 'images'
    and auth.uid()::text = (storage.foldername(name))[2]
  );
