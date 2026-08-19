-- COUR-66 : version deja appliquee au projet Supabase partage par le back-office.
--
-- Son SQL original configure `recipe_media_assets`, `admin_role_assignments`
-- et deux buckets reserves au back-office. Ces objets ne sont pas crees ni
-- consommes par l'application mobile CoursIA. Le rejouer ici rendrait un
-- `supabase db reset` impossible, car leur schema source vit hors de ce depot.
-- Ce marqueur conserve la chronologie distante sans simuler ces objets dans
-- l'environnement mobile. Voir docs/adr/008-supabase-schema-partage.md.
select 1;
