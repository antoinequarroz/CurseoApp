import type { ConnecteurMarchand } from '@/lib/connecteursEnseignes';
import type { Enseigne } from '@/types';

export type CodeControleConnecteur =
  | 'CAPACITES_DECLAREES'
  | 'SIMULATION_SANS_TRANSMISSION'
  | 'IDEMPOTENCE_PANIER'
  | 'PARCOURS_COMPLET'
  | 'RESULTAT_COHERENT'
  | 'ANNULATION_DISPONIBLE';

export interface ControleConformiteConnecteur {
  code: CodeControleConnecteur;
  ok: boolean;
  erreur?: string;
}

export interface RapportConformiteConnecteur {
  conforme: boolean;
  controles: ControleConformiteConnecteur[];
}

/**
 * Kit sans PII pour valider un adaptateur avant toute activation. Les valeurs
 * sont fictives et le rapport ne conserve ni produit réel, ni adresse.
 */
export async function verifierConformiteConnecteurMarchand(
  creerConnecteur: (enseigne: Enseigne) => ConnecteurMarchand,
  enseigne: Enseigne,
): Promise<RapportConformiteConnecteur> {
  const controles: ControleConformiteConnecteur[] = [];
  const connecteur = creerConnecteur(enseigne);
  const capacitesOk =
    connecteur.enseigne === enseigne &&
    connecteur.capacites.panier &&
    connecteur.capacites.livraison &&
    connecteur.capacites.commande;
  controles.push({ code: 'CAPACITES_DECLAREES', ok: capacitesOk });

  const environnementSansTransmission = ['simulation', 'sandbox'].includes(
    connecteur.capacites.mode,
  );
  const simulationSure =
    !environnementSansTransmission ||
    (!connecteur.capacites.paiement && !connecteur.capacites.transmissionCommande);
  controles.push({ code: 'SIMULATION_SANS_TRANSMISSION', ok: simulationSure });

  let panierId: string | null = null;
  try {
    const params = {
      cleIdempotence: 'CONFORMITE-PANIER',
      articles: [{ produitId: 'PRODUIT-FICTIF', quantite: 1, prixUnitaire: 1 }],
    } as const;
    const premier = await connecteur.synchroniserPanier(params);
    const second = await connecteur.synchroniserPanier(params);
    panierId = second.panierId;
    controles.push({
      code: 'IDEMPOTENCE_PANIER',
      ok:
        premier.panierId === second.panierId &&
        second.articlesTraites === 1 &&
        second.articlesTotal === 1,
    });
    await connecteur.verifierDisponibilite(second.panierId, 'similaire');
    await connecteur.reserverLivraison(second.panierId, 'CRENEAU-FICTIF');
    const resultat = await connecteur.preparerCommande({
      panierId: second.panierId,
      cleIdempotence: 'CONFORMITE-COMMANDE',
      fraisLivraison: 0,
    });
    controles.push({ code: 'PARCOURS_COMPLET', ok: true });
    controles.push({
      code: 'RESULTAT_COHERENT',
      ok:
        resultat.reference.length > 0 &&
        (!environnementSansTransmission ||
          (resultat.nature === 'simulation' && !resultat.transmise)),
    });
  } catch (error) {
    controles.push({
      code: 'PARCOURS_COMPLET',
      ok: false,
      erreur: error instanceof Error ? error.message : 'ERREUR_INCONNUE',
    });
  }

  try {
    if (!panierId) throw new Error('PANIER_ABSENT');
    await connecteur.annulerPanier(panierId);
    controles.push({ code: 'ANNULATION_DISPONIBLE', ok: true });
  } catch (error) {
    controles.push({
      code: 'ANNULATION_DISPONIBLE',
      ok: false,
      erreur: error instanceof Error ? error.message : 'ERREUR_INCONNUE',
    });
  }

  return { conforme: controles.every((controle) => controle.ok), controles };
}
