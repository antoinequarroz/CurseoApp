-- COUR-29 : backend des recettes communautaires. `recettes.statut_publication`
-- n'autorisait jusqu'ici que ('brouillon','publiee','archivee') — ajoute
-- 'en_attente' et 'refusee' (les deux etats de moderation requis par le
-- ticket) sans retirer 'archivee', toujours utilise par le pipeline
-- d'import CSV (COUR-17, hors perimetre de ce ticket).
alter table recettes drop constraint if exists recettes_statut_publication_check;
alter table recettes add constraint recettes_statut_publication_check
  check (statut_publication = any (array['brouillon', 'en_attente', 'publiee', 'refusee', 'archivee']));

-- Droits sur l'image : aucune colonne n'existait pour tracer cette
-- information (uniquement `source`, deja presente mais jamais imposee).
-- Texte libre (ex. "photo personnelle", "libre de droits", nom de l'auteur) --
-- pas de referentiel ferme, la variete des cas (photo perso, stock libre de
-- droits, autorisation d'un tiers) ne se pretant pas a un enum fige.
alter table recettes add column if not exists droits_image text;

-- Sentinelle pour "aucun allergene" (COUR-15 n'avait que les 14 allergenes
-- reels a declaration obligatoire) : une recette communautaire doit
-- explicitement declarer au moins une ligne dans recette_allergenes avant
-- soumission (voir trigger ci-dessous) -- sans ce code, un auteur n'ayant
-- reellement aucun allergene a declarer n'aurait aucune facon de le dire
-- explicitement, et la contrainte "au moins une ligne" serait impossible a
-- satisfaire de bonne foi.
insert into allergenes (code, libelle)
values ('aucun', 'Aucun allergène déclaré')
on conflict (code) do nothing;

-- Champs obligatoires avant soumission (source, droits image, allergenes) --
-- verifies uniquement au moment ou une recette COMMUNAUTAIRE passe en
-- 'en_attente' ou 'publiee', jamais a la creation (une recette commence
-- toujours en brouillon, se remplit progressivement, puis est soumise) :
-- au moment de l'INSERT initial, recette_allergenes ne peut de toute facon
-- pas encore avoir de ligne pour un id qui n'existe pas encore -- une
-- recette communautaire ne peut donc jamais naitre directement en
-- 'en_attente'/'publiee', uniquement y transiter via un UPDATE ulterieur.
create or replace function fn_verifier_recette_soumissible()
returns trigger
language plpgsql
as $$
begin
  if new.est_communautaire and new.statut_publication in ('en_attente', 'publiee') then
    if tg_op = 'INSERT' then
      raise exception 'une recette communautaire doit d''abord etre creee en brouillon';
    end if;
    if new.source is null or length(trim(new.source)) = 0 then
      raise exception 'source obligatoire avant soumission';
    end if;
    if new.droits_image is null or length(trim(new.droits_image)) = 0 then
      raise exception 'droits sur l''image obligatoires avant soumission';
    end if;
    if not exists (select 1 from recette_allergenes where recette_id = new.id) then
      raise exception 'au moins un allergene (ou le code "aucun") doit etre declare avant soumission';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_verifier_recette_soumissible on recettes;
create trigger trg_verifier_recette_soumissible
  before insert or update on recettes
  for each row execute function fn_verifier_recette_soumissible();
