# Changelog CoursIA

Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).

## [Unreleased]

### COUR-65 — Exercice automatique de restauration

- Exclut des sauvegardes logiques les tables vectorielles Storage que Supabase
  interdit de restaurer par `psql`.
- Verifie les sommes avant et apres dechiffrement, puis restaure chaque nouvelle
  sauvegarde dans une pile Supabase ephemere.
- Controle apres restauration le schema, la RLS, le catalogue et la presence
  des comptes applicatifs, sans publier de donnees en clair.

### COUR-64 — Stabilisation operationnelle de la beta

- Remplace la sauvegarde GitHub en echec par des exports Supabase CLI chiffres
  avant publication dans le depot public.
- Ajoute les procedures de controle, de restauration et de rotation des cles.
- Formalise les limites et l'arret d'urgence de la demonstration TestFlight des
  prix live.
- Nettoie les avertissements React des principaux tests asynchrones sans masquer
  les erreurs de test.

### Observabilité

- Active Sentry en production pour `coursia-mobile`, avec filtrage des données
  sensibles et upload des source maps depuis EAS.

### COUR-53 — Liste de courses fiable hors ligne

- Restaure la dernière liste distante quand l'appareil ne possède aucune liste locale.
- Conserve les changements concurrents et synchronise correctement une liste devenue vide.
- Ignore les réponses réseau de l'ancien compte après déconnexion.
- Affiche un statut de sauvegarde discret avec une action accessible pour réessayer.

### COUR-56 — Prix live transparents et résilients

- Affiche la source et l'heure suisse de chaque optimisation de liste.
- Conserve le dernier résultat horodaté lorsqu'une actualisation échoue.
- Revient au catalogue Supabase pour les produits déjà connus si la source live
  est momentanément indisponible, sans utiliser de prix fictif.
- Distingue une panne live d'un produit réellement absent du catalogue.

### COUR-57 — Gateway prêt pour le staging

- Verrouille SwissGroceries MCP 0.9.0 dans un service et un lockfile dédiés.
- Ajoute une image Docker non-root avec liveness, readiness et health check.
- Protège le scraping avec une limite de concurrence et un coupe-circuit.
- Produit des logs JSON corrélés sans enregistrer les produits ni les listes.
- Ajoute un coupe-circuit Edge désactivé par défaut, modifiable sans nouvelle
  build mobile.

### COUR-58 — Déploiement staging contrôlé

- Prépare un déploiement manuel Cloud Run à Zürich, protégé par une validation
  explicite de licence et une identité cloud sans clé persistante.
- Verrouille les coûts, la concurrence, les secrets et l'activation serveur.

### COUR-59 — Monitoring et rollback des prix live

- Journalise les transitions du coupe-circuit sans donnée métier ou personnelle.
- Surveille la readiness du staging avec une tolérance aux démarrages à froid.
- Ferme automatiquement le coupe-circuit Supabase après une indisponibilité
  durable et fournit un arrêt d'urgence manuel confirmé.

### COUR-60 — Canary qualité des prix live

- Mesure la couverture Migros/Coop, la validité des prix, leur comparabilité et
  la latence avec cinq recherches synthétiques.
- Produit uniquement un rapport agrégé, sans réponse fournisseur ni prix brut.
- Filtre au gateway les prix nuls, les enseignes non demandées et le contenu
  fournisseur brut avant la réponse applicative.
- Ajoute un benchmark terrain exigeant dix observations fraîches avant toute
  décision humaine d'activation.

### COUR-61 — Cohorte canary réversible

- Ajoute les modes serveur `off`, `canary` et `on`, fermés par défaut.
- Limite le canary à dix UUID issus de Supabase Auth et conservés côté serveur.
- Exige licence, recette technique, benchmark terrain et confirmation humaine
  avant l'activation manuelle.
- Maintient le flag historique fermé afin que monitoring, arrêt d'urgence et
  rollback vers une ancienne révision restent sûrs.

### COUR-62 — Activation mobile canary ciblée

- Demande au serveur une éligibilité minimale liée au compte authentifié.
- Réserve l'optimisation live marquée « En test » aux comptes Standard+ de la
  cohorte, sans révéler le canary aux autres utilisateurs.
- Conserve la simulation existante en cas de refus, de panne, de réponse
  invalide ou de serveur désactivé.
- Sépare explicitement la capacité embarquée dans le binaire de l'autorisation
  accordée exclusivement par l'Edge Function.

### Fixed

- Le catalogue et le planning restent disponibles hors ligne; les changements de repas sont synchronisés au retour du réseau.

- L'onboarding enregistre désormais les âges des enfants dans le profil Supabase sans bloquer l'accès à l'application.
- Le clavier iOS ne laisse plus de zone blanche entre le contenu et le clavier sur les écrans d'authentification.
- Un compte déjà connecté mais sans profil peut revenir à la connexion avec « Utiliser un autre compte ».

### Added

- Planning complet midi/soir avec répartition des favoris, progression, remplacement, suppression et annulation.
- Fiches recettes plus transparentes sur les estimations, la provenance et les allergènes.
- Parcours E2E Maestro connexion → profil → favori → planning → courses.

- MVP initial : onboarding 5 étapes, swipe de recettes, planning hebdomadaire, liste de courses générée automatiquement
- Comparateur de prix multi-enseignes avec données mockées structurées comme une vraie API
- Système d'abonnement 4 paliers (RevenueCat sandbox) avec PaywallModal
- Dark mode complet piloté par préférence utilisateur (auto/clair/sombre)
- Offline-first sur la liste de courses (AsyncStorage + sync différée)
- Edge Functions Supabase : proxy OpenAI, suppression de compte (nLPD), webhook RevenueCat, waitlist
- Suite de tests Jest (stores, lib, composants critiques) — couverture > 60% sur `stores/` et `lib/`
