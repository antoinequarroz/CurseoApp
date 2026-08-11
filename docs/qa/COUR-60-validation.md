# COUR-60 — Rapport de validation

## Portée livrée

- moteur de métriques canary indépendant des APIs externes ;
- runner de cinq requêtes synthétiques Migros/Coop ;
- artefact agrégé sans réponse, produit ou prix brut ;
- évaluateur de benchmark terrain à dix observations minimum ;
- workflow manuel gardé par la licence ;
- tests empêchant toute activation depuis le workflow canary.

## Validation locale

- `npm run test:gateway` : 20/20 tests verts ;
- YAML lint et Actionlint du workflow canary : verts ;
- premier canary réel local sur le gateway 0.3.0 : gate correctement rouge,
  car un résultat sur dix contenait un prix nul (`validPricePercent=90`) ;
- correction appliquée dans le gateway 0.4.0 : validation des enseignes et de
  la limite, suppression des produits à prix invalide, suppression de `raw` et
  limitation aux enseignes demandées ;
- second canary réel local, mêmes cinq recherches Migros/Coop : 100 % de
  requêtes réussies, 90 % de couverture, 100 % de schémas valides, 100 % de
  prix valides, 88,89 % comparables, p95 à 881 ms, gate vert ;
- aucun nom de produit, prix brut ou contenu fournisseur dans le rapport ;
- runner benchmark exécuté de bout en bout sur dix observations synthétiques :
  dix fraîches, médiane 2 %, p90 2 %, gate vert ;
- image Docker 0.4.0 construite, digest local
  `sha256:8ee8a93a1eb388ada4d169524c004003bda58d726c21fe5b9b59aad979888f32`,
  audit npm à 0 vulnérabilité ;
- `npm run type-check` : vert ;
- `npm run lint` : vert, aucun warning ;
- `npm test -- --coverage --runInBand` : 43 suites, 257 tests, tous verts.

La suite Jest conserve ses avertissements historiques `act(...)` et force un
worker à quitter après les tests, mais termine avec le code 0. COUR-60 n'ajoute
aucun composant React concerné par ces avertissements.

## Limites explicites

Le workflow distant n'est pas déclenché avant accord de licence et création du
staging. Le benchmark automatisé est vérifié avec des observations
synthétiques ; les dix observations réelles doivent être relevées le jour de la
recette autorisée. Aucun résultat de qualité commerciale n'est donc revendiqué
à ce stade.

Aucune migration, policy RLS, Edge Function ou interface mobile n'est modifiée.
Un reset Supabase et un test sur appareil ne sont pas requis pour COUR-60.
