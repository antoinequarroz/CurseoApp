import type { ConnecteurMarchand } from '@/lib/connecteursEnseignes';
import { ConnecteurMarchandSimule } from '@/lib/connecteurMarchandSimule';
import type { ResultatCommandeSimulee } from '@/lib/simulateurConnecteurMarchand';
import { journaliserEtapeCheckout, signalerErreurCheckout } from '@/lib/telemetrieCheckout';
import type { Enseigne, PreferencesCoursesEnLigne } from '@/types';
import type { BrouillonPanierLive, LivraisonDemo, PanierLive } from '@/stores/panierLiveStore';
import { evaluerActivationConnecteur } from '@/lib/politiqueActivationConnecteur';
import { normaliserCodeErreurCheckout } from '@/lib/diagnosticCheckout';

export type StatutSynchronisationEnseigne =
  | 'pret'
  | 'partiel'
  | 'indisponible'
  | 'erreur_temporaire'
  | 'annule';

export interface EtatOrchestrationEnseigne {
  enseigne: Enseigne;
  statut: StatutSynchronisationEnseigne;
  tentative: number;
  articlesTraites: number;
  articlesTotal: number;
  code?: string;
}

export interface ResultatOrchestrationDemo {
  confirmations: ResultatCommandeSimulee[];
  echecs: { enseigne: Enseigne; code: string }[];
  etats: EtatOrchestrationEnseigne[];
  annulations: Enseigne[];
  paiementPossible: boolean;
}

export interface OptionsOrchestrationDemo {
  maxTentatives?: number;
  creerConnecteur?: (enseigne: Enseigne, tentative: number) => ConnecteurMarchand;
}

function estErreurTemporaire(code: string): boolean {
  return ['ERREUR_TEMPORAIRE', 'TIMEOUT', 'RATE_LIMIT', 'RESEAU_INDISPONIBLE'].includes(code);
}

async function executerPanier(
  panier: PanierLive,
  brouillon: BrouillonPanierLive,
  livraisons: LivraisonDemo[],
  preferences: PreferencesCoursesEnLigne,
  tentative: number,
  creerConnecteur: NonNullable<OptionsOrchestrationDemo['creerConnecteur']>,
) {
  if (
    preferences.enseignesAutorisees.length > 0 &&
    !preferences.enseignesAutorisees.includes(panier.enseigne)
  ) {
    throw new Error('ENSEIGNE_NON_AUTORISEE');
  }
  const connecteur = creerConnecteur(panier.enseigne, tentative);
  const activation = evaluerActivationConnecteur({
    mode: 'simulation',
    capacites: connecteur.capacites,
    coupeCircuitDesactive: true,
  });
  if (!activation.autorise) {
    throw new Error('CONNECTEUR_DEMO_INVALIDE');
  }
  journaliserEtapeCheckout({
    etape: 'synchronisation_panier',
    resultat: 'debut',
    enseigne: panier.enseigne,
    tentative,
  });
  const synchronisation = await connecteur.synchroniserPanier({
    cleIdempotence: `${brouillon.id}-${panier.enseigne}`,
    articles: panier.articles.map((article) => ({
      produitId: article.produitId,
      quantite: article.quantite,
      prixUnitaire: article.prixUnitaire,
      disponibilite: article.disponibilite,
    })),
  });
  if (synchronisation.articlesTraites !== synchronisation.articlesTotal) {
    throw new Error('PANIER_PARTIEL');
  }
  journaliserEtapeCheckout({
    etape: 'verification_stock',
    resultat: 'debut',
    enseigne: panier.enseigne,
    tentative,
  });
  await connecteur.verifierDisponibilite(synchronisation.panierId, preferences.substitutionMode);
  const livraison = livraisons.find((option) => option.enseigne === panier.enseigne);
  await connecteur.reserverLivraison(synchronisation.panierId, livraison?.creneau?.id ?? livraison?.id);
  const confirmation = await connecteur.preparerCommande({
    panierId: synchronisation.panierId,
    cleIdempotence: brouillon.id,
    fraisLivraison: livraison?.prix ?? 0,
  });
  if (confirmation.nature !== 'simulation' || confirmation.transmise) {
    throw new Error('TRANSMISSION_INTERDITE_EN_DEMO');
  }
  journaliserEtapeCheckout({
    etape: 'preparation_commande',
    resultat: 'succes',
    enseigne: panier.enseigne,
    tentative,
  });
  return {
    confirmation: confirmation as ResultatCommandeSimulee,
    connecteur,
    panierId: synchronisation.panierId,
    etat: {
      enseigne: panier.enseigne,
      statut: 'pret' as const,
      tentative,
      articlesTraites: synchronisation.articlesTraites,
      articlesTotal: synchronisation.articlesTotal,
    },
  };
}

export async function orchestrerCommandeDemo(
  brouillon: BrouillonPanierLive,
  livraisons: LivraisonDemo[],
  preferences: PreferencesCoursesEnLigne,
  options: OptionsOrchestrationDemo = {},
): Promise<ResultatOrchestrationDemo> {
  const maxTentatives = Math.max(1, Math.min(3, options.maxTentatives ?? 2));
  const creerConnecteur =
    options.creerConnecteur ?? ((enseigne: Enseigne) => new ConnecteurMarchandSimule(enseigne));

  const executions = await Promise.all(
    brouillon.paniers.map(async (panier) => {
      let dernierCode = 'ERREUR_INCONNUE';
      let tentativesExecutees = 0;
      for (let tentative = 1; tentative <= maxTentatives; tentative += 1) {
        tentativesExecutees = tentative;
        try {
          const valeur = await executerPanier(
            panier,
            brouillon,
            livraisons,
            preferences,
            tentative,
            creerConnecteur,
          );
          return { succes: true as const, valeur };
        } catch (error) {
          dernierCode = normaliserCodeErreurCheckout(
            error instanceof Error ? error.message : 'ERREUR_INCONNUE',
          );
          const temporaire = estErreurTemporaire(dernierCode);
          journaliserEtapeCheckout({
            etape: 'synchronisation_panier',
            resultat: temporaire && tentative < maxTentatives ? 'nouvelle_tentative' : 'echec',
            enseigne: panier.enseigne,
            tentative,
            code: dernierCode,
          });
          if (!temporaire || tentative === maxTentatives) break;
        }
      }
      signalerErreurCheckout({
        etape: 'synchronisation_panier',
        enseigne: panier.enseigne,
        code: dernierCode,
      });
      return {
        succes: false as const,
        erreur: { enseigne: panier.enseigne, code: dernierCode },
        etat: {
          enseigne: panier.enseigne,
          statut: estErreurTemporaire(dernierCode)
            ? ('erreur_temporaire' as const)
            : dernierCode === 'PANIER_PARTIEL'
              ? ('partiel' as const)
              : ('indisponible' as const),
          tentative: tentativesExecutees,
          articlesTraites: 0,
          articlesTotal: panier.articles.length,
          code: dernierCode,
        },
      };
    }),
  );

  const echecs = executions.flatMap((execution) => (execution.succes ? [] : [execution.erreur]));
  const reussies = executions.flatMap((execution) => (execution.succes ? [execution.valeur] : []));
  if (echecs.length > 0) {
    await Promise.all(
      reussies.map(async (execution) => {
        await execution.connecteur.annulerPanier(execution.panierId);
        journaliserEtapeCheckout({
          etape: 'annulation_globale',
          resultat: 'succes',
          enseigne: execution.etat.enseigne,
        });
      }),
    );
    return {
      confirmations: [],
      echecs,
      etats: executions.map((execution) =>
        execution.succes ? { ...execution.valeur.etat, statut: 'annule' } : execution.etat,
      ),
      annulations: reussies.map((execution) => execution.etat.enseigne),
      paiementPossible: false,
    };
  }

  return {
    confirmations: reussies.map((execution) => execution.confirmation),
    echecs: [],
    etats: reussies.map((execution) => execution.etat),
    annulations: [],
    paiementPossible: reussies.length === brouillon.paniers.length && reussies.length > 0,
  };
}
