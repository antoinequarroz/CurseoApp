-- COUR-23 : isolation entre foyers. Cle d'isolation = foyer_id (via
-- foyers.responsable_id = auth.uid()), jamais profil_id seul — un membre
-- sans compte de connexion (profil_id null) doit rester protege exactement
-- comme les autres lignes de son foyer.
alter table foyers enable row level security;
alter table membres_foyer enable row level security;

drop policy if exists foyers_own on foyers;
create policy foyers_own on foyers for all
  using (auth.uid() = responsable_id)
  with check (auth.uid() = responsable_id);

-- Le responsable gere tous les membres de son foyer (lecture/ecriture).
drop policy if exists membres_foyer_responsable on membres_foyer;
create policy membres_foyer_responsable on membres_foyer for all
  using (foyer_id in (select id from foyers where responsable_id = auth.uid()))
  with check (foyer_id in (select id from foyers where responsable_id = auth.uid()));

-- Un membre avec son propre compte peut lire (pas modifier) sa propre ligne,
-- meme s'il n'est pas responsable du foyer. Policies multiples pour SELECT
-- sont combinees en OR par Postgres : ceci s'ajoute a la policy ci-dessus,
-- ne la remplace pas.
drop policy if exists membres_foyer_propre_compte on membres_foyer;
create policy membres_foyer_propre_compte on membres_foyer for select
  using (profil_id = auth.uid());
