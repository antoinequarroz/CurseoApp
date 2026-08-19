-- COUR-66 : version deja appliquee au projet Supabase partage par le back-office.
-- Elle consolide uniquement une policy de `admin_role_assignments`, objet
-- absent du schema mobile et non consomme par CoursIA. Marqueur chronologique
-- documente dans docs/adr/008-supabase-schema-partage.md.
select 1;
