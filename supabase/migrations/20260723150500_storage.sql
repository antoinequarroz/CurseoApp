-- COUR-9 : bucket de storage + policies existants en production, jamais
-- versionnes.

insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

drop policy if exists images_read on storage.objects;
create policy images_read on storage.objects for select
  using (bucket_id = 'images');

-- ATTENTION (voir supabase/SCHEMA_INVENTORY.md §4) : cette policy insert n'a
-- aucune restriction constatee en production — n'importe quel role peut
-- uploader dans le bucket public sans verification de dossier. Reproduite
-- telle quelle pour representer fidelement l'etat actuel (COUR-9 = capturer
-- l'existant, pas le corriger) ; a durcir dans un ticket dedie si ce n'est
-- pas voulu.
drop policy if exists images_write on storage.objects;
create policy images_write on storage.objects for insert
  with check (bucket_id = 'images');

drop policy if exists images_delete on storage.objects;
create policy images_delete on storage.objects for delete
  using (bucket_id = 'images' and auth.uid()::text = (storage.foldername(name))[2]);
