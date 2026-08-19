import {
  CAPACITES_SANDBOX_PARTENAIRE,
  type CommandePrepareeConnecteur,
  type ConnecteurMarchand,
  type PanierSynchroniseConnecteur,
} from '@/lib/connecteursEnseignes';
import {
  estAutorisationSandboxActive,
  estAutorisationSandboxValidee,
  type AutorisationSandboxValidee,
} from '@/lib/autorisationSandboxMarchand';
import {
  evaluerManifestPartenaire,
  type ManifestPartenaireMarchand,
} from '@/lib/manifestPartenaireMarchand';
import type { Enseigne } from '@/types';

export interface TransportMarchandSandbox {
  synchroniserPanier(params: {
    enseigne: Enseigne;
    jetonOpaque: string;
    cleIdempotence: string;
    articles: Parameters<ConnecteurMarchand['synchroniserPanier']>[0]['articles'];
  }): Promise<PanierSynchroniseConnecteur>;
  verifierDisponibilite(params: {
    enseigne: Enseigne;
    jetonOpaque: string;
    panierId: string;
    modeSubstitution: string;
  }): Promise<void>;
  reserverLivraison(params: {
    enseigne: Enseigne;
    jetonOpaque: string;
    panierId: string;
    livraisonId?: string;
  }): Promise<void>;
  preparerCommande(params: {
    enseigne: Enseigne;
    jetonOpaque: string;
    panierId: string;
    cleIdempotence: string;
    fraisLivraison: number;
  }): Promise<CommandePrepareeConnecteur>;
  annulerPanier(params: {
    enseigne: Enseigne;
    jetonOpaque: string;
    panierId: string;
  }): Promise<void>;
}

/** Adaptateur sandbox uniquement : il ne sait ni débiter ni transmettre une commande réelle. */
export class ConnecteurMarchandSandbox implements ConnecteurMarchand {
  readonly capacites = CAPACITES_SANDBOX_PARTENAIRE;
  readonly enseigne: Enseigne;
  readonly #autorisation: AutorisationSandboxValidee;
  readonly #transport: TransportMarchandSandbox;
  readonly #maintenant: () => Date;

  constructor(
    manifest: ManifestPartenaireMarchand,
    autorisation: AutorisationSandboxValidee,
    transport: TransportMarchandSandbox,
    maintenant: () => Date = () => new Date(),
  ) {
    if (evaluerManifestPartenaire(manifest).length > 0) throw new Error('MANIFEST_INVALIDE');
    if (!estAutorisationSandboxValidee(autorisation)) throw new Error('AUTORISATION_SANDBOX_INVALIDE');
    if (manifest.enseigne !== autorisation.enseigne) throw new Error('ENSEIGNE_INCORRECTE');
    this.enseigne = manifest.enseigne;
    this.#autorisation = autorisation;
    this.#transport = transport;
    this.#maintenant = maintenant;
  }

  async synchroniserPanier(
    params: Parameters<ConnecteurMarchand['synchroniserPanier']>[0],
  ): Promise<PanierSynchroniseConnecteur> {
    this.exigerAutorisation();
    return await this.#transport.synchroniserPanier({
      enseigne: this.enseigne,
      jetonOpaque: this.#autorisation.jetonOpaque,
      ...params,
    });
  }

  async verifierDisponibilite(
    panierId: string,
    modeSubstitution: string,
  ): Promise<void> {
    this.exigerAutorisation();
    await this.#transport.verifierDisponibilite({
      enseigne: this.enseigne,
      jetonOpaque: this.#autorisation.jetonOpaque,
      panierId,
      modeSubstitution,
    });
  }

  async reserverLivraison(panierId: string, livraisonId: string | undefined): Promise<void> {
    this.exigerAutorisation();
    await this.#transport.reserverLivraison({
      enseigne: this.enseigne,
      jetonOpaque: this.#autorisation.jetonOpaque,
      panierId,
      livraisonId,
    });
  }

  async preparerCommande(
    params: Parameters<ConnecteurMarchand['preparerCommande']>[0],
  ): Promise<CommandePrepareeConnecteur> {
    this.exigerAutorisation();
    const resultat = await this.#transport.preparerCommande({
      enseigne: this.enseigne,
      jetonOpaque: this.#autorisation.jetonOpaque,
      ...params,
    });
    if (
      resultat.nature !== 'simulation' ||
      resultat.transmise ||
      !resultat.reference.startsWith('SANDBOX-') ||
      !Number.isFinite(resultat.montant) ||
      resultat.montant < 0
    ) {
      throw new Error('REPONSE_SANDBOX_INVALIDE');
    }
    return resultat;
  }

  async annulerPanier(panierId: string): Promise<void> {
    this.exigerAutorisation();
    await this.#transport.annulerPanier({
      enseigne: this.enseigne,
      jetonOpaque: this.#autorisation.jetonOpaque,
      panierId,
    });
  }

  private exigerAutorisation(): void {
    if (!estAutorisationSandboxActive(this.#autorisation, this.#maintenant())) {
      throw new Error('AUTORISATION_SANDBOX_EXPIREE');
    }
  }
}
