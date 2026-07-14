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
