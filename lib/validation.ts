/** Schemas Zod pour tous les formulaires — jamais de validation manuelle ad-hoc. */
import { z } from 'zod';

export const ProfilSchema = z.object({
  prenom: z.string().min(1, 'Le prénom est requis').max(50),
  nb_personnes: z.number().int().min(1).max(20),
  nb_enfants: z.number().int().min(0).max(15),
  enfants_ages: z.array(z.number().int().min(0).max(17)),
  budget_hebdo: z.number().min(10, 'Budget minimum CHF 10').max(2000),
  regime: z.array(z.enum(['vegetarien', 'vegan', 'halal', 'sans_gluten', 'sans_lactose', 'sans_noix', 'poisson'])),
  allergies: z.array(z.string()),
  objectifs: z.array(
    z.enum([
      'perdre_poids',
      'prise_masse',
      'manger_sain',
      'rapide',
      'diminuer_charge_mentale',
      'maitriser_budget',
      'manger_varie',
      'reduire_gaspillage',
    ]),
  ),
  enseignes_favorites: z
    .array(z.enum(['coop', 'migros', 'lidl', 'aldi', 'ottos', 'manor_food']))
    .min(1, 'Choisis au moins une enseigne'),
});

export type ProfilFormValues = z.infer<typeof ProfilSchema>;

export const EmailSchema = z.string().email('Adresse email invalide');
export const MotDePasseSchema = z.string().min(8, 'Minimum 8 caractères');

/** COUR-28 : NPA suisse = exactement 4 chiffres (meme regle que la contrainte DB `adresses_livraison`). */
export const AdresseSchema = z.object({
  libelle: z.string().min(1, 'Le libellé est requis').max(50),
  rue: z.string().min(1, 'La rue est requise').max(100),
  npa: z.string().regex(/^[0-9]{4}$/, 'NPA suisse invalide (4 chiffres)'),
  ville: z.string().min(1, 'La ville est requise').max(50),
  complement: z.string().max(100).optional(),
  estDefaut: z.boolean(),
});

export type AdresseFormValues = z.infer<typeof AdresseSchema>;
