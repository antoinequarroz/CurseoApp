import type { Enseigne, ModeSubstitution } from '@/types';
import type { LignePanierLive } from '@/stores/panierLiveStore';

export type EtatSimulationMarchand =
  | 'panier_cree'
  | 'articles_configures'
  | 'stock_verifie'
  | 'substitutions_resolues'
  | 'creneau_reserve'
  | 'montant_confirme'
  | 'commande_simulee'
  | 'annule';

export class ErreurSimulationMarchand extends Error {
  constructor(
    public readonly code: 'TRANSITION_INVALIDE' | 'SUBSTITUTION_NON_RESOLUE' | 'CLE_IDEMPOTENCE_REUTILISEE',
  ) {
    super(code);
  }
}

export interface ResultatCommandeSimulee {
  nature: 'simulation';
  transmise: false;
  reference: `SIM-${string}`;
  enseigne: Enseigne;
  montant: number;
}

export class SimulateurConnecteurMarchand {
  private etatCourant: EtatSimulationMarchand = 'panier_cree';
  private lignes: LignePanierLive[] = [];
  private montant = 0;
  private confirmation: ResultatCommandeSimulee | null = null;

  constructor(private readonly enseigne: Enseigne) {}

  get etat(): EtatSimulationMarchand {
    return this.etatCourant;
  }

  configurerArticles(lignes: LignePanierLive[]): void {
    if (this.etatCourant === 'annule' || this.etatCourant === 'commande_simulee') {
      throw new ErreurSimulationMarchand('TRANSITION_INVALIDE');
    }
    this.lignes = lignes.map((ligne) => ({ ...ligne }));
    this.confirmation = null;
    this.etatCourant = 'articles_configures';
  }

  verifierStock(): void {
    this.exiger('articles_configures');
    this.etatCourant = 'stock_verifie';
  }

  resoudreSubstitutions(mode: ModeSubstitution): void {
    this.exiger('stock_verifie');
    const indisponible = this.lignes.some((ligne) => ligne.disponibilite === 'non_confirmee');
    if (indisponible && mode === 'jamais') throw new ErreurSimulationMarchand('SUBSTITUTION_NON_RESOLUE');
    this.etatCourant = 'substitutions_resolues';
  }

  reserverCreneau(): void {
    this.exiger('substitutions_resolues');
    this.etatCourant = 'creneau_reserve';
  }

  confirmerMontant(fraisLivraison: number): number {
    this.exiger('creneau_reserve');
    this.montant =
      Math.round(
        (this.lignes.reduce((total, ligne) => total + ligne.prixUnitaire * ligne.quantite, 0) +
          fraisLivraison) *
          100,
      ) / 100;
    this.etatCourant = 'montant_confirme';
    return this.montant;
  }

  creerCommandeSimulee(cleIdempotence: string): ResultatCommandeSimulee {
    if (this.confirmation) {
      const referenceAttendue =
        `SIM-${this.enseigne}-${cleIdempotence.replace(/[^a-zA-Z0-9-]/g, '')}` as const;
      if (this.confirmation.reference !== referenceAttendue)
        throw new ErreurSimulationMarchand('CLE_IDEMPOTENCE_REUTILISEE');
      return this.confirmation;
    }
    this.exiger('montant_confirme');
    this.confirmation = {
      nature: 'simulation',
      transmise: false,
      reference: `SIM-${this.enseigne}-${cleIdempotence.replace(/[^a-zA-Z0-9-]/g, '')}`,
      enseigne: this.enseigne,
      montant: this.montant,
    };
    this.etatCourant = 'commande_simulee';
    return this.confirmation;
  }

  annuler(): void {
    this.etatCourant = 'annule';
  }

  private exiger(attendu: EtatSimulationMarchand): void {
    if (this.etatCourant !== attendu) throw new ErreurSimulationMarchand('TRANSITION_INVALIDE');
  }
}
