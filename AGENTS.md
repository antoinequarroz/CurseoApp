# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Definition of Done (COUR-36)

Before considering any ticket done, apply `docs/DEFINITION_OF_DONE.md` — tsc/lint/tests green, migrations replayed from a full `supabase db reset` with RLS/triggers proven against a real non-privileged account, production deployment actually verified (migrations AND Edge Functions — never assumed auto-deployed), UI changes tested on device/simulator (or the limitation explicitly stated, never faked).
