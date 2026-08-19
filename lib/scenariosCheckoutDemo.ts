import { ConnecteurMarchandSimule } from '@/lib/connecteurMarchandSimule';
import type {
  ConnecteurMarchand,
  PanierSynchroniseConnecteur,
} from '@/lib/connecteursEnseignes';
import type { Enseigne } from '@/types';

export type ScenarioCheckoutDemo = 'succes' | 'timeout_coop' | 'panier_partiel_migros';

class ConnecteurScenarioDemo implements ConnecteurMarchand {
  readonly capacites;

  constructor(
    readonly enseigne: Enseigne,
    private readonly scenario: ScenarioCheckoutDemo,
    private readonly base = new ConnecteurMarchandSimule(enseigne),
  ) {
    this.capacites = base.capacites;
  }

  async synchroniserPanier(
    params: Parameters<ConnecteurMarchand['synchroniserPanier']>[0],
  ): Promise<PanierSynchroniseConnecteur> {
    if (this.scenario === 'timeout_coop' && this.enseigne === 'coop') {
      throw new Error('TIMEOUT');
    }
    const resultat = await this.base.synchroniserPanier(params);
    return this.scenario === 'panier_partiel_migros' && this.enseigne === 'migros'
      ? { ...resultat, articlesTraites: Math.max(0, resultat.articlesTotal - 1) }
      : resultat;
  }

  verifierDisponibilite(...params: Parameters<ConnecteurMarchand['verifierDisponibilite']>) {
    return this.base.verifierDisponibilite(...params);
  }

  reserverLivraison(...params: Parameters<ConnecteurMarchand['reserverLivraison']>) {
    return this.base.reserverLivraison(...params);
  }

  preparerCommande(...params: Parameters<ConnecteurMarchand['preparerCommande']>) {
    return this.base.preparerCommande(...params);
  }

  annulerPanier(...params: Parameters<ConnecteurMarchand['annulerPanier']>) {
    return this.base.annulerPanier(...params);
  }
}

/** Injection réservée aux tests et démonstrations locales; aucun flag distant ne la pilote. */
export function creerFabriqueScenarioCheckout(scenario: ScenarioCheckoutDemo) {
  return (enseigne: Enseigne): ConnecteurMarchand =>
    new ConnecteurScenarioDemo(enseigne, scenario);
}
