-- COUR-34 : idempotence et detection d'evenements hors-ordre pour le webhook
-- RevenueCat (supabase/functions/revenuecat-webhook). `id` = `event.id`
-- fourni par RevenueCat (unique par evenement, y compris sur un replay
-- automatique en cas de reponse non-2xx) : la contrainte de cle primaire
-- rejette nativement un doublon, aucune logique applicative fragile
-- necessaire pour la partie "doublons".
--
-- Contenu volontairement minimal ("journalises sans donnees sensibles
-- inutiles", critere du ticket) : ni le corps complet de l'evenement, ni
-- les infos de paiement/receipt/email — seulement ce qui est necessaire pour
-- l'idempotence et la detection d'ordre d'arrivee different.
create table if not exists webhook_evenements_abonnement (
  id text primary key,
  app_user_id uuid not null,
  type text not null,
  event_timestamp_ms bigint not null,
  traite_le timestamptz not null default now()
);

-- Le webhook doit retrouver rapidement le dernier evenement (le plus recent
-- par event_timestamp_ms) deja applique pour un utilisateur donne, pour
-- ignorer un evenement qui arriverait en retard (ex. retry reseau) apres un
-- evenement plus recent deja traite.
create index if not exists idx_webhook_evenements_app_user_id
  on webhook_evenements_abonnement (app_user_id, event_timestamp_ms desc);

-- RLS active sans policy : accessible uniquement via service_role (le
-- webhook), jamais par anon/authenticated — meme pattern que rate_limits et
-- waitlist (voir supabase/SCHEMA_INVENTORY.md).
alter table webhook_evenements_abonnement enable row level security;

grant all on table webhook_evenements_abonnement to anon, authenticated, service_role;
