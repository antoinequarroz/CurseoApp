/**
 * Types partages de l'application Coursia.
 * Toute donnee metier transitant entre lib/, stores/, hooks/ et app/ doit
 * etre typee ici — zero `any` toilere dans le reste du code.
 */

export type Regime = 'vegetarien' | 'vegan' | 'halal' | 'sans_gluten' | 'sans_lactose';
export type Objectif =
  | 'perdre_poids'
  | 'prise_masse'
  | 'manger_sain'
  | 'rapide'
  | 'diminuer_charge_mentale'
  | 'maitriser_budget'
  | 'manger_varie'
  | 'reduire_gaspillage';
export type Enseigne = 'coop' | 'migros' | 'lidl' | 'aldi' | 'ottos' | 'manor_food';
export type ModeOptimisation = 'prix_minimum' | 'equilibre' | 'premium' | 'bio' | 'sante';
export type NiveauAbonnement = 'gratuit' | 'standard' | 'premium' | 'famille';
export type Difficulte = 'facile' | 'moyen' | 'difficile';
export type Rayon =
  | 'Fruits & Legumes'
  | 'Viandes'
  | 'Produits laitiers'
  | 'Epicerie'
  | 'Conserves'
  | 'Surgeles'
  | 'Boissons'
  | 'Hygiene';

/** Ordre d'affichage fixe des rayons dans la liste de courses. */
export const ORDRE_RAYONS: Rayon[] = [
  'Fruits & Legumes',
  'Viandes',
  'Produits laitiers',
  'Epicerie',
  'Conserves',
  'Surgeles',
  'Boissons',
  'Hygiene',
];

export interface Profil {
  id: string;
  prenom: string;
  nb_personnes: number;
  nb_enfants: number;
  /** Age (en annees) de chaque enfant du foyer — influence quantites et produits
   *  suggeres (ex. produits bebe). Longueur toujours synchronisee avec nb_enfants. */
  enfants_ages: number[];
  budget_hebdo: number;
  regime: Regime[];
  allergies: string[];
  objectifs: Objectif[];
  enseignes_favorites: Enseigne[];
  abonnement: NiveauAbonnement;
  notifications_activees: boolean;
  notifications_planning: boolean;
  notifications_budget: boolean;
  notifications_promos: boolean;
  notifications_bilan: boolean;
  apparence: 'auto' | 'clair' | 'sombre';
  cgvu_version_acceptee: string | null;
}

export interface Ingredient {
  nom: string;
  quantite: number;
  unite: string;
  rayon?: Rayon;
}

export interface Recette {
  id: string;
  titre: string;
  description: string;
  image_url: string;
  blurhash?: string;
  temps_preparation: number;
  difficulte: Difficulte;
  cout_estime: number;
  calories: number;
  portions: number;
  regime: Regime[];
  allergenes: string[];
  ingredients: Ingredient[];
  etapes: string[];
  est_communautaire: boolean;
}

/** Categorie utilisee pour le swipe "on cerne vos gouts" — derivee de la recette, pas stockee. */
export type CategorieGout = 'viande' | 'poisson' | 'vegetarien' | 'petit_dejeuner' | 'dessert';

export const CATEGORIES_GOUT: CategorieGout[] = ['viande', 'poisson', 'vegetarien', 'petit_dejeuner', 'dessert'];

export type FrequenceRepas = 'jamais' | 'rarement' | 'parfois' | 'souvent' | 'quotidien';

export const FREQUENCES_REPAS: FrequenceRepas[] = ['jamais', 'rarement', 'parfois', 'souvent', 'quotidien'];

export interface SondageGouts {
  frequence_viande: FrequenceRepas | null;
  frequence_poisson: FrequenceRepas | null;
  produits_favoris: string[];
}

export interface RepasPlanifie {
  recette: Recette;
  /** Nombre de personnes pour ce repas precis (invites), si different du foyer. */
  portions?: number;
}

export interface RepasJour {
  midi?: RepasPlanifie;
  soir?: RepasPlanifie;
  /** true si l'utilisateur a explicitement choisi de ne rien prevoir ce moment-la
   *  (distinct de "pas encore decide", qui reste undefined/false). */
  midiIgnore?: boolean;
  soirIgnore?: boolean;
}

export interface PlanningHebdomadaire {
  lundi: RepasJour;
  mardi: RepasJour;
  mercredi: RepasJour;
  jeudi: RepasJour;
  vendredi: RepasJour;
  samedi: RepasJour;
  dimanche: RepasJour;
}

export type JourSemaine = keyof PlanningHebdomadaire;

export const JOURS_SEMAINE: JourSemaine[] = [
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
  'dimanche',
];

export interface ItemCourse {
  id: string;
  produit: string;
  quantite: number;
  unite: string;
  rayon: Rayon;
  coche: boolean;
  recette_origine?: string;
}

export interface ItemStock {
  produit: string;
  quantite: number;
  unite: string;
}

export interface PrixProduit {
  enseigne: Enseigne;
  prix_unitaire: number;
  prix_kilo?: number;
  promotion?: string;
  disponible: boolean;
}

export interface ProduitComparatif {
  nom: string;
  prix: PrixProduit[];
  meilleur_prix: Enseigne;
}

export interface PanierEnseigne {
  enseigne: Enseigne;
  produits: ItemCourse[];
  montant: number;
}

export interface RecapCommande {
  paniers: PanierEnseigne[];
  montant_total: number;
  economies: number;
  mode_optimisation: ModeOptimisation;
}

export interface Commande {
  id: string;
  paniers: PanierEnseigne[];
  montant_total: number;
  economies: number;
  statut: string;
  created_at: string;
}
