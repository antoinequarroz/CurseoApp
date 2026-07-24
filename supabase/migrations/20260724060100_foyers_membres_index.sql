create index if not exists idx_foyers_responsable on foyers (responsable_id);
create index if not exists idx_membres_foyer_foyer on membres_foyer (foyer_id);
create index if not exists idx_membres_foyer_profil on membres_foyer (profil_id);
