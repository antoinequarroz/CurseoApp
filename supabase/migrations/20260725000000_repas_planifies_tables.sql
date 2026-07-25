-- COUR-26 : remplace la semaine courante implicite (stores/planningStore.ts,
-- cote client uniquement jusqu'ici) par un modele date reel + multi-semaines
-- cote base. L'ancienne table `planning_repas` (COUR-9, jamais lue par
-- l'app, 0 ligne en production reverifiee avant cette migration -- meme
-- logique que COUR-14) n'est PAS supprimee ici : `listes_courses.planning_id`
-- la reference encore et listes_courses EST utilisee en production —
-- toucher cette FK sort du perimetre de ce ticket. `repas_planifies`
-- devient le modele de reference pour tout nouveau developpement du
-- planning ; la decision de retirer definitivement `planning_repas` reste
-- un choix produit separe (deja note comme tel dans SCHEMA_INVENTORY.md).
--
-- Comportement temporel (critere du ticket) : une ligne n'existe que pour
-- un creneau DECIDE (recette assignee OU explicitement ignore) -- "pas
-- encore decide" reste l'absence de ligne, jamais un troisieme etat
-- stocke. C'est exactement la semantique deja etablie cote client
-- (RepasJour.midi/midiIgnore, COUR-11).

create table if not exists repas_planifies (
  id uuid primary key default gen_random_uuid(),
  profil_id uuid not null references profils(id) on delete cascade,
  date_repas date not null,
  moment text not null check (moment = any (array['midi', 'soir'])),
  ignore boolean not null default false,
  recette_id uuid references recettes(id) on delete set null,
  portions integer check (portions is null or portions > 0),
  -- Membres du foyer concernes (COUR-25) -- tableau simple plutot qu'une
  -- table de jointure : coherent avec le niveau de rigueur deja accepte sur
  -- profils.regime/allergies (text[] sans integrite referentielle). Postgres
  -- ne permet pas de contrainte FK sur les elements d'un array.
  membre_ids uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now(),
  -- Un seul repas par profil/date/moment -- le "doublon impossible" du
  -- critere du ticket.
  constraint repas_planifies_creneau_unique unique (profil_id, date_repas, moment),
  -- Coherence ignore/recette : jamais les deux a la fois, jamais ni l'un ni
  -- l'autre (voir "Comportement temporel" ci-dessus).
  constraint repas_planifies_coherence check (
    (ignore and recette_id is null) or (not ignore and recette_id is not null)
  )
);
