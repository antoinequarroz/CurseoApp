import Constants from 'expo-constants';
import { z } from 'zod';
import { supabase } from './supabase';
import type { ComparatifPrixReel, OffrePrix } from './prixRepository';
import type { Enseigne, ItemCourse, ModeOptimisation } from '@/types';

const extra = Constants.expoConfig?.extra ?? {};
export const swissGroceriesBuildEnabled = extra.swissGroceriesEnabled === true;

export const ENSEIGNES_SWISS_GROCERIES = ['migros', 'coop', 'aldi', 'lidl', 'ottos'] as const satisfies readonly Enseigne[];
export type EnseigneSwissGroceries = (typeof ENSEIGNES_SWISS_GROCERIES)[number];

interface ProduitLive {
  id: string;
  name: string;
  brand?: string;
  size?: { value: number; unit: string };
  price: { current: number; regular?: number; currency: 'CHF' };
  unitPrice?: { value: number; per: 'kg' | 'l' | 'piece' };
  promotion?: { description?: string };
}

interface ReponseLive {
  byChain?: Partial<Record<Enseigne, ProduitLive[]>>;
}

const EligibiliteSchema = z.object({ eligible: z.boolean() });

export async function fetchSwissGroceriesEligibility(): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke('swissgroceries', {
    body: { action: 'eligibility' },
  });
  if (error) throw error;
  return EligibiliteSchema.parse(data).eligible;
}

const ProduitPlanSchema = z.object({
  chain: z.enum(ENSEIGNES_SWISS_GROCERIES),
  id: z.string(),
  name: z.string(),
  brand: z.string().optional(),
  size: z.object({ value: z.number(), unit: z.string() }).optional(),
  price: z.object({ current: z.number(), regular: z.number().optional(), currency: z.literal('CHF') }),
  productUrl: z.string().url().optional(),
});

const LignePlanSchema = z.object({
  requested: z.object({ query: z.string(), quantity: z.number().optional() }).passthrough(),
  matched: ProduitPlanSchema,
  lineTotal: z.number(),
});

const PlanSchema = z.object({
  strategy: z.enum(['single_store', 'split_cart', 'absolute_cheapest']),
  totalChf: z.number(),
  stops: z.array(z.object({
    store: z.object({
      chain: z.enum(ENSEIGNES_SWISS_GROCERIES),
      id: z.string().optional(),
      name: z.string().optional(),
    }),
    items: z.array(LignePlanSchema),
    subtotalChf: z.number(),
  })),
  unmatchedItems: z.array(z.object({ query: z.string() }).passthrough()),
}).passthrough();

const PlanResultatSchema = z.object({
  primary: PlanSchema,
  alternatives: z.array(PlanSchema),
  meta: z.object({
    source: z.literal('SwissGroceries'),
    collectedAt: z.string().datetime(),
  }).optional(),
});

export type StrategieCoursesLive = 'single_store' | 'split_cart' | 'absolute_cheapest';

export interface LigneCoursesOptimisee {
  demande: string;
  produit: string;
  marque?: string;
  format?: string;
  montant: number;
  urlProduit?: string;
}

export interface ArretCoursesOptimise {
  enseigne: EnseigneSwissGroceries;
  magasin?: string;
  montant: number;
  articles: LigneCoursesOptimisee[];
}

export interface OptimisationCoursesLive {
  strategie: StrategieCoursesLive;
  montantTotal: number;
  arrets: ArretCoursesOptimise[];
  articlesNonTrouves: string[];
  economieEstimee: number | null;
  source: 'SwissGroceries';
  collecteLe: string;
}

function formatProduit(produit: ProduitLive): string {
  const morceaux = [produit.brand];
  if (produit.size) morceaux.push(`${produit.size.value} ${produit.size.unit}`);
  return morceaux.filter(Boolean).join(' · ');
}

/**
 * Interroge le proxy authentifie. Une offre par enseigne est conservee : le
 * premier resultat du MCP est le meilleur match semantique, pas forcement le
 * paquet au prix facial le plus bas.
 */
export async function fetchComparatifPrixLive(nomProduit: string): Promise<ComparatifPrixReel | null> {
  const { data, error } = await supabase.functions.invoke<ReponseLive>('swissgroceries', {
    body: { action: 'search', query: nomProduit, chains: ENSEIGNES_SWISS_GROCERIES, limit: 4 },
  });
  if (error) throw error;

  const collecteLe = new Date().toISOString();
  const offres: OffrePrix[] = ENSEIGNES_SWISS_GROCERIES.flatMap((enseigne) => {
    const produit = data?.byChain?.[enseigne]?.[0];
    if (!produit || !(produit.price?.current > 0)) return [];

    const offre: OffrePrix = {
      offreId: `swissgroceries:${enseigne}:${produit.id}`,
      enseigne,
      format: formatProduit(produit),
      quantite: produit.size?.value ?? 1,
      unite: produit.unitPrice?.per ?? produit.size?.unit ?? 'piece',
      prix: produit.price.current,
      prixUnitaire: produit.unitPrice?.value ?? produit.price.current,
      promotion: produit.promotion?.description ?? null,
      source: 'SwissGroceries (live)',
      collecteLe,
      expire: false,
    };
    return [offre];
  }).sort((a, b) => a.prixUnitaire - b.prixUnitaire);

  if (offres.length === 0) return null;
  return {
    produitCanoniqueId: `swissgroceries:${nomProduit.trim().toLowerCase()}`,
    nom: nomProduit,
    offres,
    meilleurPrixUnitaire: offres[0]!.prixUnitaire,
  };
}

function strategieDepuisMode(mode: ModeOptimisation): StrategieCoursesLive {
  if (mode === 'prix_minimum') return 'absolute_cheapest';
  return 'split_cart';
}

function tagsDepuisMode(mode: ModeOptimisation): ('organic' | 'premium')[] | undefined {
  if (mode === 'bio') return ['organic'];
  if (mode === 'premium') return ['premium'];
  return undefined;
}

function formatTaille(size: { value: number; unit: string } | undefined): string | undefined {
  return size ? `${size.value} ${size.unit}` : undefined;
}

/** Optimise uniquement les articles encore a acheter, pour un NPA suisse. */
export async function optimiserListeCoursesLive(params: {
  items: ItemCourse[];
  npa: string;
  mode: ModeOptimisation;
  enseignesFavorites?: Enseigne[];
}): Promise<OptimisationCoursesLive> {
  const itemsActifs = params.items.filter((item) => !item.coche).slice(0, 40);
  if (itemsActifs.length === 0) throw new Error('Aucun article a optimiser');

  const tags = tagsDepuisMode(params.mode);
  const favorites = params.enseignesFavorites?.filter(
    (enseigne): enseigne is EnseigneSwissGroceries =>
      ENSEIGNES_SWISS_GROCERIES.includes(enseigne as EnseigneSwissGroceries),
  );
  const chains = favorites?.length ? favorites : [...ENSEIGNES_SWISS_GROCERIES];

  const { data, error } = await supabase.functions.invoke('swissgroceries', {
    body: {
      action: 'plan',
      items: itemsActifs.map((item) => ({
        query: item.produit,
        // Les grammes/ml de recette decrivent un besoin, pas un nombre de
        // paquets : le planner choisit donc un produit, sans multiplier son prix.
        quantity: ['unite', 'piece', 'pièce'].includes(item.unite.toLowerCase())
          ? Math.max(1, Math.round(item.quantite))
          : 1,
        ...(tags ? { filters: { tags } } : {}),
      })),
      near: { zip: params.npa },
      chains,
      strategy: strategieDepuisMode(params.mode),
      splitPenaltyChf: 2,
      radiusKm: 10,
    },
  });
  if (error) throw error;

  const parsed = PlanResultatSchema.parse(data);
  const referenceUneEnseigne = [parsed.primary, ...parsed.alternatives]
    .filter((plan) => plan.strategy === 'single_store' && plan.totalChf > 0)
    .sort((a, b) => a.totalChf - b.totalChf)[0];
  const economie = referenceUneEnseigne
    ? Math.max(0, referenceUneEnseigne.totalChf - parsed.primary.totalChf)
    : null;

  return {
    strategie: parsed.primary.strategy,
    montantTotal: parsed.primary.totalChf,
    arrets: parsed.primary.stops.map((stop) => ({
      enseigne: stop.store.chain,
      magasin: stop.store.name,
      montant: stop.subtotalChf,
      articles: stop.items.map((ligne) => ({
        demande: ligne.requested.query,
        produit: ligne.matched.name,
        marque: ligne.matched.brand,
        format: formatTaille(ligne.matched.size),
        montant: ligne.lineTotal,
        urlProduit: ligne.matched.productUrl,
      })),
    })),
    articlesNonTrouves: parsed.primary.unmatchedItems.map((item) => item.query),
    economieEstimee: economie,
    source: parsed.meta?.source ?? 'SwissGroceries',
    collecteLe: parsed.meta?.collectedAt ?? new Date().toISOString(),
  };
}
