alter table repas_planifies enable row level security;

drop policy if exists repas_planifies_own on repas_planifies;
create policy repas_planifies_own on repas_planifies for all
  using (auth.uid() = profil_id)
  with check (auth.uid() = profil_id);
