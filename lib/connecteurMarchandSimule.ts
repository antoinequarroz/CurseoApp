import {
  CAPACITES_SIMULATEUR_CHECKOUT,
  type ConnecteurMarchand,
  type PanierSynchroniseConnecteur,
} from '@/lib/connecteursEnseignes';
import {
  SimulateurConnecteurMarchand,
  type ResultatCommandeSimulee,
} from '@/lib/simulateurConnecteurMarchand';
import type { Enseigne, ModeSubstitution } from '@/types';

/** Adaptateur in-process : aucune requête, aucune PII et aucune transmission. */
export class ConnecteurMarchandSimule implements ConnecteurMarchand {
  readonly capacites = CAPACITES_SIMULATEUR_CHECKOUT;
  private readonly simulateur: SimulateurConnecteurMarchand;
  private articles: Parameters<SimulateurConnecteurMarchand['configurerArticles']>[0] = [];

  constructor(readonly enseigne: Enseigne) {
    this.simulateur = new SimulateurConnecteurMarchand(enseigne);
  }

  async synchroniserPanier(params: {
    cleIdempotence: string;
    articles: readonly {
      produitId: string;
      quantite: number;
      prixUnitaire: number;
      disponibilite?: 'resultat_catalogue' | 'non_confirmee';
    }[];
  }): Promise<PanierSynchroniseConnecteur> {
    this.articles = params.articles.map((article, index) => ({
      id: `${this.enseigne}:${article.produitId}:${index}`,
      demande: article.produitId,
      produitId: article.produitId,
      produit: article.produitId,
      quantite: article.quantite,
      prixUnitaire: article.prixUnitaire,
      disponibilite: article.disponibilite ?? 'resultat_catalogue',
    }));
    this.simulateur.configurerArticles(this.articles);
    return {
      panierId: `SIM-PANIER-${this.enseigne}-${params.cleIdempotence.replace(/[^a-zA-Z0-9-]/g, '')}`,
      articlesTraites: this.articles.length,
      articlesTotal: this.articles.length,
    };
  }

  async verifierDisponibilite(_panierId: string, modeSubstitution: string): Promise<void> {
    this.simulateur.verifierStock();
    this.simulateur.resoudreSubstitutions(modeSubstitution as ModeSubstitution);
  }

  async reserverLivraison(_panierId: string, _livraisonId: string | undefined): Promise<void> {
    this.simulateur.reserverCreneau();
  }

  async preparerCommande(params: {
    panierId: string;
    cleIdempotence: string;
    fraisLivraison: number;
  }): Promise<ResultatCommandeSimulee> {
    this.simulateur.confirmerMontant(params.fraisLivraison);
    return this.simulateur.creerCommandeSimulee(params.cleIdempotence);
  }

  async annulerPanier(_panierId: string): Promise<void> {
    this.simulateur.annuler();
  }
}
