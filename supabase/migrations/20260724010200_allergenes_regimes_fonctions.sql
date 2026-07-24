-- COUR-15 : mecanisme de resolution des synonymes + vue de deduction.
--
-- fn_normaliser_terme : meme logique que `normaliserAllergie` cote client
-- (hooks/useRecettes.ts — NFD + suppression diacritiques + minuscule + trim),
-- portee en SQL via l'extension unaccent pour que la normalisation soit
-- identique cote base (utilisee par synonymes_allergenes.terme, stocke deja
-- normalise) et cote resolution.
create or replace function fn_normaliser_terme(terme text)
returns text
language sql
stable
as $$
  select trim(lower(extensions.unaccent(terme)));
$$;

-- fn_resoudre_allergene : entree = n'importe quelle variante (accentuee,
-- majuscule, etc.), sortie = l'allergene canonique ou NULL si aucun
-- synonyme connu. Expose automatiquement par PostgREST en RPC
-- (POST /rest/v1/rpc/fn_resoudre_allergene), donc testable en HTTP sans
-- acces direct a la base (utilise par scripts/verify-allergenes.sh).
create or replace function fn_resoudre_allergene(terme text)
returns table (allergene_id uuid, code text, libelle text)
language sql
stable
as $$
  select a.id, a.code, a.libelle
  from synonymes_allergenes s
  join allergenes a on a.id = s.allergene_id
  where s.terme = fn_normaliser_terme(fn_resoudre_allergene.terme)
  limit 1;
$$;

-- recette_allergenes_effectifs : union des allergenes EXPLICITEMENT
-- declares (recette_allergenes) et DEDUITS des ingredients
-- (recette_ingredients -> ingredient_allergenes). Union all volontaire (pas
-- de deduplication) : une meme recette peut avoir plusieurs lignes pour le
-- meme allergene (ex. declare en 'confirme' ET deduit en 'possible' via un
-- autre ingredient) — c'est au consommateur de la vue de decider comment
-- agreger, mais AUCUNE ligne 'possible' n'est jamais filtree ou remontee en
-- 'confirme' ici : c'est ce qui garantit qu'un cas ambigu reste visible
-- comme ambigu plutot que d'etre traite comme sur.
create or replace view recette_allergenes_effectifs as
select
  ra.recette_id, a.id as allergene_id, a.code, a.libelle,
  'declare' as source, 'confirme' as certitude
from recette_allergenes ra
join allergenes a on a.id = ra.allergene_id
union all
select
  ri.recette_id, a.id as allergene_id, a.code, a.libelle,
  'deduit' as source, ia.certitude
from recette_ingredients ri
join ingredient_allergenes ia on ia.ingredient_id = ri.ingredient_id
join allergenes a on a.id = ia.allergene_id;
