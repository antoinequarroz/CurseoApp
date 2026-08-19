-- COUR-71 a COUR-76 : conserve le snapshot d'un checkout multi-enseignes de
-- demonstration sans jamais le confondre avec une commande transmise a un
-- marchand. Les vrais connecteurs reutiliseront ce contrat, mais changeront
-- `nature` et fourniront leurs references externes.
alter table public.commandes
  add column if not exists nature text not null default 'simulation'
    check (nature in ('simulation', 'marchand')),
  add column if not exists strategie text
    check (strategie is null or strategie in ('single_store', 'split_cart', 'absolute_cheapest')),
  add column if not exists adresse_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists livraisons jsonb not null default '[]'::jsonb,
  add column if not exists paiement_reference text,
  add column if not exists source_prix text,
  add column if not exists collecte_le timestamptz;

alter table public.commandes
  add constraint commandes_reference_demo_coherente
  check (nature <> 'simulation' or paiement_reference is null or paiement_reference like 'DEMO-%');

comment on column public.commandes.nature is
  'simulation = aucun paiement ni envoi marchand; marchand = futur connecteur officiel uniquement';
comment on column public.commandes.paiement_reference is
  'Reference interne de simulation ou reference du PSP; jamais un numero de carte';

-- L'ancienne policy `FOR ALL USING` n'avait pas de WITH CHECK explicite.
-- On la rend volontairement complete avant d'ajouter des snapshots d'adresse.
drop policy if exists commandes_own on public.commandes;
create policy commandes_own
  on public.commandes
  for all
  to authenticated
  using ((select auth.uid()) = profil_id)
  with check ((select auth.uid()) = profil_id and nature = 'simulation');

revoke all on table public.commandes from anon, authenticated;
grant select, insert, update, delete on table public.commandes to authenticated;
grant all on table public.commandes to service_role;

create unique index if not exists commandes_paiement_reference_unique
  on public.commandes (paiement_reference)
  where paiement_reference is not null;
