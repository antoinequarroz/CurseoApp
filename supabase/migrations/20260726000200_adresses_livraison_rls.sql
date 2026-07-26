alter table adresses_livraison enable row level security;

drop policy if exists adresses_livraison_own on adresses_livraison;
create policy adresses_livraison_own on adresses_livraison for all
  using (auth.uid() = profil_id)
  with check (auth.uid() = profil_id);
