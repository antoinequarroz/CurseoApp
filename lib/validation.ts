/** Schemas Zod pour tous les formulaires — jamais de validation manuelle ad-hoc. */
import { z } from 'zod';

export const ProfilSchema = z.object({
  prenom: z.string().min(1, 'Le prénom est requis').max(50),
  nb_personnes: z.number().int().min(1).max(20),
  nb_enfants: z.number().int().min(0).max(15),
  budget_hebdo: z.number().min(10, 'Budget minimum CHF 10').max(2000),
  regime: z.array(z.enum(['vegetarien', 'vegan', 'halal', 'sans_gluten', 'sans_lactose'])),
  allergies: z.array(z.string()),
  objectifs: z.array(z.enum(['perdre_poids', 'prise_masse', 'manger_sain', 'rapide'])),
  enseignes_favorites: z
    .array(z.enum(['coop', 'migros', 'lidl', 'aldi', 'ottos', 'manor_food']))
    .min(1, 'Choisis au moins une enseigne'),
});

export type ProfilFormValues = z.infer<typeof ProfilSchema>;

export const EmailSchema = z.string().email('Adresse email invalide');
export const MotDePasseSchema = z.string().min(8, 'Minimum 8 caractères');
