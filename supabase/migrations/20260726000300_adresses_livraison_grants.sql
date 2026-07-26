-- Meme convention que les grants precedents (COUR-9/10) : RLS est la seule
-- barriere reelle pour anon/authenticated.
grant all on table adresses_livraison to anon, authenticated, service_role;
