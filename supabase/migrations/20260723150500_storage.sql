-- COUR-9 : bucket de storage + policies existants en production, jamais
-- versionnes.

insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

drop policy if exists images_read on storage.objects;
create policy images_read on storage.objects for select
  using (bucket_id = 'images');

-- Historique : cette policy insert n'avait aucune restriction constatee en
-- production au moment de ce ticket (n'importe quel role pouvait uploader
-- dans le bucket public sans verification de dossier) — corrige juste apres
-- par 20260723160000_restreindre_images_write.sql. Definie ici sans
-- restriction pour representer fidelement l'etat historique ; la migration
-- suivante la resserre.
drop policy if exists images_write on storage.objects;
create policy images_write on storage.objects for insert
  with check (bucket_id = 'images');

drop policy if exists images_delete on storage.objects;
create policy images_delete on storage.objects for delete
  using (bucket_id = 'images' and auth.uid()::text = (storage.foldername(name))[2]);
