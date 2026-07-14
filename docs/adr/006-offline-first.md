# ADR-006 : Stratégie offline-first sur la liste de courses

## Statut : Accepté

## Contexte

Les utilisateurs consultent et cochent leur liste de courses en magasin, souvent avec une connexion mobile dégradée ou absente. Une expérience qui échoue silencieusement hors-ligne serait inacceptable sur le cas d'usage principal de l'app.

## Décision

- `coursesStore` (Zustand) persiste dans AsyncStorage via le middleware `persist` — la liste et l'état coché survivent à une perte de connexion et au redémarrage de l'app
- React Query est configuré en `networkMode: 'offlineFirst'` avec `gcTime: 24h` pour les données serveur
- `<OfflineBanner />` informe l'utilisateur sans bloquer l'interaction
- La synchronisation vers Supabase se fait de manière optimiste dès que la connexion revient (pas de queue de mutation complexe pour le MVP — le prochain écrit gagne)

## Conséquences

- L'utilisateur peut toujours cocher ses articles, même en sous-sol de supermarché
- Contrepartie : pas de résolution de conflit multi-appareil pour le MVP (acceptable, un foyer = un appareil actif à la fois en magasin dans la plupart des cas ; la Phase Famille avec listes partagées en temps réel devra revisiter ce choix)
