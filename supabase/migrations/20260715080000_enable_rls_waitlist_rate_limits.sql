-- Corrige une faille de securite : waitlist et rate_limits n'avaient pas RLS
-- active, les rendant lisibles/ecrivables par n'importe quel client muni de
-- la cle anon publique. Ces deux tables ne sont accedees que par les edge
-- functions via la cle service_role (qui contourne RLS de toute facon) :
-- activer RLS sans policy suffit donc a bloquer tout acces client direct.
alter table waitlist enable row level security;
alter table rate_limits enable row level security;
