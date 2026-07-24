-- COUR-17 : pipeline d'import CSV controle pour les recettes. `cle_externe`
-- est la cle naturelle stable qui rend l'import idempotent (upsert dessus) —
-- les recettes creees via l'app n'en ont pas besoin (nullable), seules
-- celles importees par ce pipeline en ont une.
alter table recettes add column if not exists cle_externe text;
alter table recettes drop constraint if exists recettes_cle_externe_unique;
alter table recettes add constraint recettes_cle_externe_unique unique (cle_externe);

-- fn_importer_recettes_csv : coeur du pipeline. Prend un tableau jsonb DEJA
-- structure par le script Node (scripts/import-recettes-csv.mjs — parsing
-- CSV + typage cote Node, cote SQL on ne fait QUE de la validation
-- referentielle/metier + l'ecriture, pour eviter de dupliquer un parseur
-- CSV en PL/pgSQL). Deux passes :
--   1) valide TOUTES les lignes (jamais fail-fast) et compte a_creer/a_maj
--   2) ecrit uniquement si dry_run=false ET zero erreur sur tout le fichier
--      (jamais d'import partiel silencieux — soit tout, soit rien)
-- Idempotent : upsert sur cle_externe, puis remplacement complet
-- (delete+reinsert) des lignes filles (ingredients/etapes/regimes/allergenes)
-- — rejouer le meme fichier produit exactement le meme etat, jamais de
-- doublons.
create or replace function fn_importer_recettes_csv(lignes jsonb, dry_run boolean default false)
returns jsonb
language plpgsql
as $$
declare
  erreurs jsonb := '[]'::jsonb;
  a_creer int := 0;
  a_mettre_a_jour int := 0;
  ligne jsonb;
  rec_id uuid;
  ing jsonb;
  v_code text;
  idx int;
  cles_vues text[] := '{}';
begin
  for ligne in select * from jsonb_array_elements(lignes)
  loop
    if coalesce(ligne->>'cle_externe', '') = '' then
      erreurs := erreurs || jsonb_build_object('ligne', (ligne->>'ligne')::int, 'champ', 'cle_externe', 'message', 'obligatoire');
    elsif (ligne->>'cle_externe') = any (cles_vues) then
      erreurs := erreurs || jsonb_build_object('ligne', (ligne->>'ligne')::int, 'champ', 'cle_externe', 'message', 'doublon dans le fichier : ' || (ligne->>'cle_externe'));
    else
      cles_vues := array_append(cles_vues, ligne->>'cle_externe');
    end if;

    if coalesce(ligne->>'titre', '') = '' then
      erreurs := erreurs || jsonb_build_object('ligne', (ligne->>'ligne')::int, 'champ', 'titre', 'message', 'obligatoire');
    end if;

    if (ligne->>'portions') is null or (ligne->>'portions')::int <= 0 then
      erreurs := erreurs || jsonb_build_object('ligne', (ligne->>'ligne')::int, 'champ', 'portions', 'message', 'doit etre un entier > 0');
    end if;

    if coalesce(ligne->>'difficulte', '') <> '' and not (ligne->>'difficulte' = any (array['facile', 'moyen', 'difficile'])) then
      erreurs := erreurs || jsonb_build_object('ligne', (ligne->>'ligne')::int, 'champ', 'difficulte', 'message', 'valeur invalide : ' || (ligne->>'difficulte'));
    end if;

    if coalesce(ligne->>'statut_publication', '') <> '' and not (ligne->>'statut_publication' = any (array['brouillon', 'publiee', 'archivee'])) then
      erreurs := erreurs || jsonb_build_object('ligne', (ligne->>'ligne')::int, 'champ', 'statut_publication', 'message', 'valeur invalide : ' || (ligne->>'statut_publication'));
    end if;

    if jsonb_array_length(coalesce(ligne->'ingredients', '[]'::jsonb)) = 0 then
      erreurs := erreurs || jsonb_build_object('ligne', (ligne->>'ligne')::int, 'champ', 'ingredients', 'message', 'au moins un ingredient requis');
    end if;

    if jsonb_array_length(coalesce(ligne->'etapes', '[]'::jsonb)) = 0 then
      erreurs := erreurs || jsonb_build_object('ligne', (ligne->>'ligne')::int, 'champ', 'etapes', 'message', 'au moins une etape requise');
    end if;

    for v_code in select jsonb_array_elements_text(coalesce(ligne->'regimes', '[]'::jsonb))
    loop
      if not exists (select 1 from regimes where regimes.code = v_code) then
        erreurs := erreurs || jsonb_build_object('ligne', (ligne->>'ligne')::int, 'champ', 'regimes', 'message', 'regime inconnu du referentiel : ' || v_code);
      end if;
    end loop;

    for v_code in select jsonb_array_elements_text(coalesce(ligne->'allergenes', '[]'::jsonb))
    loop
      if not exists (select 1 from allergenes where allergenes.code = v_code) then
        erreurs := erreurs || jsonb_build_object('ligne', (ligne->>'ligne')::int, 'champ', 'allergenes', 'message', 'allergene inconnu du referentiel : ' || v_code);
      end if;
    end loop;

    for ing in select * from jsonb_array_elements(coalesce(ligne->'ingredients', '[]'::jsonb))
    loop
      if not exists (select 1 from ingredients i where lower(i.nom) = lower(ing->>'nom')) then
        erreurs := erreurs || jsonb_build_object('ligne', (ligne->>'ligne')::int, 'champ', 'ingredients', 'message', 'ingredient inconnu du catalogue : ' || (ing->>'nom'));
      end if;
      if not exists (select 1 from unites_mesure u where u.code = ing->>'unite') then
        erreurs := erreurs || jsonb_build_object('ligne', (ligne->>'ligne')::int, 'champ', 'ingredients', 'message', 'unite inconnue pour ' || (ing->>'nom') || ' : ' || (ing->>'unite'));
      end if;
      if (ing->>'quantite') is null or (ing->>'quantite')::numeric <= 0 then
        erreurs := erreurs || jsonb_build_object('ligne', (ligne->>'ligne')::int, 'champ', 'ingredients', 'message', 'quantite invalide pour ' || (ing->>'nom'));
      end if;
    end loop;

    if coalesce(ligne->>'cle_externe', '') <> '' and exists (select 1 from recettes r where r.cle_externe = ligne->>'cle_externe') then
      a_mettre_a_jour := a_mettre_a_jour + 1;
    else
      a_creer := a_creer + 1;
    end if;
  end loop;

  if jsonb_array_length(erreurs) = 0 and not dry_run then
    for ligne in select * from jsonb_array_elements(lignes)
    loop
      insert into recettes (
        cle_externe, titre, description, image_url, temps_preparation, difficulte,
        cout_estime, calories, proteines_g, glucides_g, lipides_g, portions, source, statut_publication
      ) values (
        ligne->>'cle_externe', ligne->>'titre', nullif(ligne->>'description', ''), nullif(ligne->>'image_url', ''),
        nullif(ligne->>'temps_preparation', '')::int, nullif(ligne->>'difficulte', ''),
        nullif(ligne->>'cout_estime', '')::numeric, nullif(ligne->>'calories', '')::int,
        nullif(ligne->>'proteines_g', '')::numeric, nullif(ligne->>'glucides_g', '')::numeric, nullif(ligne->>'lipides_g', '')::numeric,
        (ligne->>'portions')::int, nullif(ligne->>'source', ''), coalesce(nullif(ligne->>'statut_publication', ''), 'brouillon')
      )
      on conflict (cle_externe) do update set
        titre = excluded.titre, description = excluded.description, image_url = excluded.image_url,
        temps_preparation = excluded.temps_preparation, difficulte = excluded.difficulte,
        cout_estime = excluded.cout_estime, calories = excluded.calories,
        proteines_g = excluded.proteines_g, glucides_g = excluded.glucides_g, lipides_g = excluded.lipides_g,
        portions = excluded.portions, source = excluded.source, statut_publication = excluded.statut_publication,
        updated_at = now()
      returning id into rec_id;

      delete from recette_ingredients where recette_id = rec_id;
      delete from recette_etapes where recette_id = rec_id;
      delete from recette_regimes where recette_id = rec_id;
      delete from recette_allergenes where recette_id = rec_id;

      idx := 0;
      for ing in select * from jsonb_array_elements(coalesce(ligne->'ingredients', '[]'::jsonb))
      loop
        idx := idx + 1;
        insert into recette_ingredients (recette_id, ingredient_id, quantite, unite, ordre)
        select rec_id, i.id, (ing->>'quantite')::numeric, ing->>'unite', idx
        from ingredients i where lower(i.nom) = lower(ing->>'nom');
      end loop;

      idx := 0;
      for v_code in select jsonb_array_elements_text(coalesce(ligne->'etapes', '[]'::jsonb))
      loop
        idx := idx + 1;
        insert into recette_etapes (recette_id, numero, instruction) values (rec_id, idx, v_code);
      end loop;

      if jsonb_array_length(coalesce(ligne->'regimes', '[]'::jsonb)) > 0 then
        insert into recette_regimes (recette_id, regime_id)
        select rec_id, r.id from regimes r
        where r.code in (select jsonb_array_elements_text(ligne->'regimes'));
      end if;

      if jsonb_array_length(coalesce(ligne->'allergenes', '[]'::jsonb)) > 0 then
        insert into recette_allergenes (recette_id, allergene_id)
        select rec_id, a.id from allergenes a
        where a.code in (select jsonb_array_elements_text(ligne->'allergenes'));
      end if;
    end loop;
  end if;

  return jsonb_build_object(
    'dry_run', dry_run,
    'importe', (jsonb_array_length(erreurs) = 0 and not dry_run),
    'erreurs', erreurs,
    'resume', jsonb_build_object('a_creer', a_creer, 'a_mettre_a_jour', a_mettre_a_jour, 'total_lignes', jsonb_array_length(lignes))
  );
end;
$$;

-- Outil d'operateur controle, pas une fonctionnalite app : execute
-- uniquement via service_role (scripts/import-recettes-csv.mjs), jamais
-- expose a anon/authenticated.
revoke all on function fn_importer_recettes_csv(jsonb, boolean) from public;
grant execute on function fn_importer_recettes_csv(jsonb, boolean) to service_role;
