import Constants from 'expo-constants';
import { z } from 'zod';
import { supabase } from './supabase';
import type { ComparatifPrixReel, OffrePrix } from './prixRepository';
import {
  calculerPaquets,
  classerSelonPreferences,
  evaluerCorrespondance,
  normaliserProduit,
  type NiveauCorrespondance,
} from './correspondanceProduit';
import type { Enseigne, ItemCourse, ModeOptimisation, PreferencesCoursesEnLigne } from '@/types';

const extra = Constants.expoConfig?.extra ?? {};
export const swissGroceriesBuildEnabled = extra.swissGroceriesEnabled === true;

export const ENSEIGNES_SWISS_GROCERIES = [
  'migros',
  'coop',
  'aldi',
  'lidl',
  'ottos',
] as const satisfies readonly Enseigne[];
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
  byChain?: Partial<Record<EnseigneSwissGroceries, ProduitLive[]>>;
}

export interface ProduitRechercheLive {
  id: string;
  enseigne: EnseigneSwissGroceries;
  nom: string;
  marque?: string;
  format?: string;
  taille?: { value: number; unit: string };
  prix: number;
  pertinence: NiveauCorrespondance;
  scoreCorrespondance?: number;
  validationRequise: boolean;
  raisonsCorrespondance?: ('nom' | 'partiel' | 'variante_a_verifier')[];
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

const PlanSchema = z
  .object({
    strategy: z.enum(['single_store', 'split_cart', 'absolute_cheapest']),
    totalChf: z.number(),
    stops: z.array(
      z.object({
        store: z.object({
          chain: z.enum(ENSEIGNES_SWISS_GROCERIES),
          id: z.string().optional(),
          name: z.string().optional(),
        }),
        items: z.array(LignePlanSchema),
        subtotalChf: z.number(),
      }),
    ),
    unmatchedItems: z.array(z.object({ query: z.string() }).passthrough()),
  })
  .passthrough();

const PlanResultatSchema = z.object({
  primary: PlanSchema,
  alternatives: z.array(PlanSchema),
  meta: z
    .object({
      source: z.literal('SwissGroceries'),
      collectedAt: z.string().datetime(),
    })
    .optional(),
});

export type StrategieCoursesLive = 'single_store' | 'split_cart' | 'absolute_cheapest';

export interface LigneCoursesOptimisee {
  produitId: string;
  demande: string;
  produit: string;
  marque?: string;
  format?: string;
  taillePaquet?: { value: number; unit: string };
  quantite: number;
  prixUnitaire: number;
  montant: number;
  urlProduit?: string;
  besoinQuantite: number;
  besoinUnite: string;
  nombrePaquets: number;
  formatCompatible: boolean;
  pertinence: NiveauCorrespondance;
  validationRequise: boolean;
  selectionAutomatique?: boolean;
  raisonsCorrespondance?: ('nom' | 'partiel' | 'variante_a_verifier')[];
  disponibilite: 'resultat_catalogue';
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
  alternatives: OptionOptimisationCoursesLive[];
}

export interface OptionOptimisationCoursesLive {
  id: string;
  strategie: StrategieCoursesLive;
  montantTotal: number;
  arrets: ArretCoursesOptimise[];
  articlesNonTrouves: string[];
}

function formatProduit(produit: ProduitLive): string {
  const morceaux = [produit.brand];
  if (produit.size) morceaux.push(`${produit.size.value} ${produit.size.unit}`);
  return morceaux.filter(Boolean).join(' · ');
}

/** Résultats explicites pour remplacer une ligne du brouillon COUR-71. */
async function rechercherProduitsLiveDansEnseignes(
  nomProduit: string,
  enseignes: readonly EnseigneSwissGroceries[],
  preferences?: PreferencesCoursesEnLigne,
): Promise<ProduitRechercheLive[]> {
  const { data, error } = await supabase.functions.invoke<ReponseLive>('swissgroceries', {
    body: { action: 'search', query: nomProduit, chains: enseignes, limit: 4 },
  });
  if (error) throw error;
  const produits = enseignes.flatMap((enseigne) =>
    (data?.byChain?.[enseigne] ?? []).flatMap((produit) =>
      produit.price?.current > 0
        ? [
            (() => {
              const correspondance = evaluerCorrespondance(nomProduit, produit.name, produit.brand);
              return {
                id: produit.id,
                enseigne,
                nom: produit.name,
                marque: produit.brand,
                format: produit.size ? `${produit.size.value} ${produit.size.unit}` : undefined,
                taille: produit.size,
                prix: produit.price.current,
                pertinence: correspondance.niveau,
                scoreCorrespondance: correspondance.score,
                validationRequise: correspondance.validationRequise,
                raisonsCorrespondance: correspondance.raisons,
              };
            })(),
          ]
        : [],
    ),
  );
  const classesPreferences = classerSelonPreferences(produits, preferences);
  const rang: Record<NiveauCorrespondance, number> = { forte: 2, moyenne: 1, faible: 0 };
  return classesPreferences.sort((a, b) => rang[b.pertinence] - rang[a.pertinence]);
}

export async function rechercherProduitsLive(
  nomProduit: string,
  preferences?: PreferencesCoursesEnLigne,
): Promise<ProduitRechercheLive[]> {
  return rechercherProduitsLiveDansEnseignes(nomProduit, ENSEIGNES_SWISS_GROCERIES, preferences);
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
  preferences?: PreferencesCoursesEnLigne;
}): Promise<OptimisationCoursesLive> {
  const itemsActifs = params.items.filter((item) => !item.coche).slice(0, 40);
  if (itemsActifs.length === 0) throw new Error('Aucun article a optimiser');

  const tags = tagsDepuisMode(params.mode);
  const favorites = params.enseignesFavorites?.filter((enseigne): enseigne is EnseigneSwissGroceries =>
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
  const versOption = (plan: z.infer<typeof PlanSchema>): OptionOptimisationCoursesLive => ({
    id: `${plan.strategy}:${plan.stops.map((stop) => stop.store.chain).join('+')}:${plan.totalChf}`,
    strategie: plan.strategy,
    montantTotal: 0,
    arrets: plan.stops.map((stop) => ({
      enseigne: stop.store.chain,
      magasin: stop.store.name,
      montant: 0,
      articles: stop.items.map((ligne) => {
        const itemSource = itemsActifs.find(
          (item) => item.produit.trim().toLowerCase() === ligne.requested.query.trim().toLowerCase(),
        );
        const besoin = itemSource ?? {
          quantite: Math.max(1, ligne.requested.quantity ?? 1),
          unite: 'piece',
        };
        const paquets = calculerPaquets(besoin, ligne.matched.size);
        const correspondance = evaluerCorrespondance(
          ligne.requested.query,
          ligne.matched.name,
          ligne.matched.brand,
        );
        const quantite = paquets.nombrePaquets;
        return {
          produitId: ligne.matched.id,
          demande: ligne.requested.query,
          produit: ligne.matched.name,
          marque: ligne.matched.brand,
          format: formatTaille(ligne.matched.size),
          taillePaquet: ligne.matched.size,
          quantite,
          prixUnitaire: ligne.matched.price.current,
          montant: ligne.matched.price.current * quantite,
          urlProduit: ligne.matched.productUrl,
          besoinQuantite: besoin.quantite,
          besoinUnite: besoin.unite,
          nombrePaquets: quantite,
          formatCompatible: paquets.formatCompatible,
          pertinence: correspondance.niveau,
          validationRequise: correspondance.validationRequise,
          selectionAutomatique: true,
          raisonsCorrespondance: correspondance.raisons,
          disponibilite: 'resultat_catalogue' as const,
        };
      }),
    })),
    articlesNonTrouves: plan.unmatchedItems.map((item) => item.query),
  });

  const requetesNonTrouvees = Array.from(
    new Set(
      [parsed.primary, ...parsed.alternatives]
        .flatMap((plan) => plan.unmatchedItems.map((item) => item.query.trim()))
        .filter(Boolean),
    ),
  );
  const resolutions = new Map<string, ProduitRechercheLive[]>();
  const estCandidatAutomatique = (produit: ProduitRechercheLive) =>
    produit.raisonsCorrespondance?.some((raison) => raison === 'nom' || raison === 'partiel') === true &&
    !produit.raisonsCorrespondance?.includes('variante_a_verifier');
  for (let index = 0; index < requetesNonTrouvees.length; index += 4) {
    const lot = requetesNonTrouvees.slice(index, index + 4);
    const resultats = await Promise.allSettled(
      lot.map(async (requete) => {
        let produits = await rechercherProduitsLiveDansEnseignes(requete, chains, params.preferences);
        const requeteSimplifiee = normaliserProduit(requete).join(' ');
        if (
          !produits.some(estCandidatAutomatique) &&
          requeteSimplifiee &&
          requeteSimplifiee !== requete.toLowerCase()
        ) {
          const produitsSimplifies = await rechercherProduitsLiveDansEnseignes(
            requeteSimplifiee,
            chains,
            params.preferences,
          );
          produits = [...produits, ...produitsSimplifies];
        }
        return { requete, produits };
      }),
    );
    resultats.forEach((resultat) => {
      if (resultat.status === 'fulfilled') resolutions.set(resultat.value.requete, resultat.value.produits);
    });
  }

  const resoudreAutomatiquement = (
    option: OptionOptimisationCoursesLive,
  ): OptionOptimisationCoursesLive => {
    const arrets = option.arrets.map((arret) => ({ ...arret, articles: [...arret.articles] }));
    const nonResolus: string[] = [];
    for (const demande of option.articlesNonTrouves) {
      const enseignesOption = option.strategie === 'single_store'
        ? new Set(arrets.map((arret) => arret.enseigne))
        : null;
      const candidat = (resolutions.get(demande) ?? []).find(
        (produit) =>
          (!enseignesOption || enseignesOption.has(produit.enseigne)) &&
          estCandidatAutomatique(produit),
      );
      const besoin = itemsActifs.find(
        (item) => item.produit.trim().toLowerCase() === demande.trim().toLowerCase(),
      );
      if (!candidat || !besoin) {
        nonResolus.push(demande);
        continue;
      }
      const paquets = calculerPaquets(besoin, candidat.taille);
      const article: LigneCoursesOptimisee = {
        produitId: candidat.id,
        demande,
        produit: candidat.nom,
        marque: candidat.marque,
        format: candidat.format,
        taillePaquet: candidat.taille,
        quantite: paquets.nombrePaquets,
        prixUnitaire: candidat.prix,
        montant: candidat.prix * paquets.nombrePaquets,
        besoinQuantite: besoin.quantite,
        besoinUnite: besoin.unite,
        nombrePaquets: paquets.nombrePaquets,
        formatCompatible: paquets.formatCompatible,
        pertinence: candidat.pertinence,
        validationRequise: false,
        selectionAutomatique: true,
        raisonsCorrespondance: candidat.raisonsCorrespondance,
        disponibilite: 'resultat_catalogue',
      };
      const arret = arrets.find((element) => element.enseigne === candidat.enseigne);
      if (arret) arret.articles.push(article);
      else arrets.push({ enseigne: candidat.enseigne, montant: 0, articles: [article] });
    }
    return { ...option, arrets, articlesNonTrouves: nonResolus };
  };

  const finaliserTotal = (option: OptionOptimisationCoursesLive): OptionOptimisationCoursesLive => {
    const arrets = option.arrets.map((arret) => {
      const montant = arret.articles.reduce((total, article) => total + article.montant, 0);
      return { ...arret, montant };
    });
    return { ...option, arrets, montantTotal: arrets.reduce((total, arret) => total + arret.montant, 0) };
  };
  const primaire = finaliserTotal(resoudreAutomatiquement(versOption(parsed.primary)));
  const alternatives = parsed.alternatives
    .map(versOption)
    .map(resoudreAutomatiquement)
    .map(finaliserTotal)
    .filter(
      (option, index, options) =>
        option.id !== primaire.id && options.findIndex((candidate) => candidate.id === option.id) === index,
    );

  const referenceUneEnseigne = [primaire, ...alternatives]
    .filter((plan) => plan.strategie === 'single_store' && plan.montantTotal > 0)
    .sort((a, b) => a.montantTotal - b.montantTotal)[0];
  const economie = referenceUneEnseigne
    ? Math.max(0, referenceUneEnseigne.montantTotal - primaire.montantTotal)
    : null;

  return {
    strategie: primaire.strategie,
    montantTotal: primaire.montantTotal,
    arrets: primaire.arrets,
    articlesNonTrouves: primaire.articlesNonTrouves,
    economieEstimee: economie,
    source: parsed.meta?.source ?? 'SwissGroceries',
    collecteLe: parsed.meta?.collectedAt ?? new Date().toISOString(),
    alternatives,
  };
}
