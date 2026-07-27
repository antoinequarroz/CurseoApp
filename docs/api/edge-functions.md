# Edge Functions

| Function | Rôle | Auth requise | Rate limit |
|---|---|---|---|
| `ai-assistant` | Proxy OpenAI pour l'assistant IA | Oui + abonnement Standard+ | 20 req/heure/utilisateur |
| `delete-account` | Anonymisation + suppression de compte (nLPD) | Oui | 3 req/24h |
| `revenuecat-webhook` | Synchronise `profils.abonnement` depuis RevenueCat | Secret webhook | — |
| `waitlist` | Inscription liste d'attente pré-lancement | Non (honeypot anti-spam) | — |

## Déploiement

```bash
supabase functions deploy ai-assistant
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set REVENUECAT_WEBHOOK_SECRET=...
```

Toutes les fonctions valident leur input avec Zod avant tout traitement et renvoient les headers de sécurité standards (`X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`).

## `revenuecat-webhook` (COUR-34)

- **Authenticité** : `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>` comparé en temps constant (`comparaisonTempsConstant`, `_shared/crypto.ts`) — RevenueCat V1 n'envoie pas de JWT Supabase et ne signe pas le payload (pas de HMAC), donc `verify_jwt = false` est déclaré explicitement dans `supabase/config.toml` (`[functions.revenuecat-webhook]`) pour que la gateway ne rejette pas la requête *avant* d'atteindre ce contrôle applicatif. Sans cette section, un déploiement (`supabase functions deploy revenuecat-webhook`) rejette silencieusement tous les appels RevenueCat avec `401 Invalid Token` — vérifier après tout redéploiement que la fonction accepte bien un appel avec le secret et rejette un appel sans secret ou avec un secret invalide (`scripts/verify-revenuecat-webhook.sh`).
- **Idempotence** : chaque événement RevenueCat porte un `id` unique (y compris sur un replay après une réponse non-2xx). Table `webhook_evenements_abonnement` (clé primaire `id`) : un événement déjà présent est un no-op silencieux (200, aucun retraitement). Enregistré uniquement après traitement réussi — un échec (`majAbonnement` en erreur) reste rejouable par RevenueCat.
- **Ordre d'arrivée différent** : les événements pour un même utilisateur peuvent arriver dans le désordre (retry réseau, files distinctes côté RevenueCat). Un événement plus ancien que le dernier déjà traité pour cet utilisateur (comparaison sur `event_timestamp_ms`) est enregistré (pour rester idempotent s'il est rejoué) mais n'a aucun effet sur `profils.abonnement`.
- **Journal minimal** : `webhook_evenements_abonnement` ne stocke que `id`, `app_user_id`, `type`, `event_timestamp_ms`, `traite_le` — jamais le corps complet de l'événement, les infos de paiement/receipt, ni l'email. RLS activé sans policy (accessible uniquement via `service_role`, même pattern que `rate_limits`/`waitlist`).
- **Événements traités** : `INITIAL_PURCHASE`/`RENEWAL`/`PRODUCT_CHANGE` (achat/renouvellement, palier prioritaire `famille > premium > standard`, rejet 422 si aucun entitlement reconnu — jamais de palier deviné), `CANCELLATION` (accès conservé jusqu'à expiration, **sauf** `cancel_reason = 'REFUND'` qui retire le droit immédiatement), `EXPIRATION` (downgrade immédiat vers `gratuit`), `BILLING_ISSUE` (notification, pas de downgrade, grace period Apple 16 jours).
- **Tests** : `scripts/verify-revenuecat-webhook.sh` (authenticité, payloads invalides, doublons, ordre différent, remboursement vs annulation, idempotence sans effet de bord dupliqué), branché en CI.
