-- COUR-29 : `signalements` ne tracait ni qui avait examine un signalement
-- ni quand — impossible de savoir si un `statut` different de 'en_attente'
-- a ete decide par un moderateur reel ou change par erreur.
alter table signalements add column if not exists moderateur_id uuid references profils(id);
alter table signalements add column if not exists traite_le timestamptz;
