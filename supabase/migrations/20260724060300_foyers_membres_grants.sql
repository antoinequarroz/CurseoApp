-- Meme convention que 20260723150400_grants.sql (COUR-9/10) : RLS est la
-- seule barriere reelle pour anon/authenticated, les grants restent larges.
grant all on table foyers, membres_foyer to anon, authenticated, service_role;
