import { normaliserProduit } from '@/lib/correspondanceProduit';
import type { BrouillonPanierLive, LignePanierLive } from '@/stores/panierLiveStore';

export type CodeReconciliation =
  | 'correspondance_a_valider'
  | 'quantite_insuffisante'
  | 'format_inconnu'
  | 'disponibilite_inconnue'
  | 'doublon_possible'
  | 'produit_introuvable';

export interface ProblemeReconciliation {
  id: string;
  code: CodeReconciliation;
  severite: 'bloquant' | 'attention';
  ligneId?: string;
  produit: string;
}

export interface ReconciliationPanier {
  problemes: ProblemeReconciliation[];
  bloquants: ProblemeReconciliation[];
  attentions: ProblemeReconciliation[];
  estPret: boolean;
}

function cleDoublon(enseigne: string, ligne: LignePanierLive): string {
  return `${enseigne}:${normaliserProduit(ligne.demande).join('_')}`;
}

export function reconcilierPanier(brouillon: BrouillonPanierLive): ReconciliationPanier {
  const problemes: ProblemeReconciliation[] = [];
  const groupes = new Map<string, LignePanierLive[]>();

  for (const panier of brouillon.paniers) {
    for (const ligne of panier.articles) {
      const cle = cleDoublon(panier.enseigne, ligne);
      groupes.set(cle, [...(groupes.get(cle) ?? []), ligne]);
      if (ligne.validationRequise && !ligne.validationUtilisateur) {
        problemes.push({
          id: `validation:${ligne.id}`,
          code: 'correspondance_a_valider',
          severite: 'bloquant',
          ligneId: ligne.id,
          produit: ligne.produit,
        });
      }
      if (ligne.nombrePaquets != null && ligne.quantite < ligne.nombrePaquets) {
        problemes.push({
          id: `quantite:${ligne.id}`,
          code: 'quantite_insuffisante',
          severite: 'bloquant',
          ligneId: ligne.id,
          produit: ligne.produit,
        });
      }
      if (ligne.formatCompatible === false) {
        problemes.push({
          id: `format:${ligne.id}`,
          code: 'format_inconnu',
          severite: 'attention',
          ligneId: ligne.id,
          produit: ligne.produit,
        });
      }
      if (ligne.disponibilite !== 'resultat_catalogue') {
        problemes.push({
          id: `disponibilite:${ligne.id}`,
          code: 'disponibilite_inconnue',
          severite: 'attention',
          ligneId: ligne.id,
          produit: ligne.produit,
        });
      }
    }
  }

  for (const lignes of groupes.values()) {
    if (lignes.length < 2) continue;
    problemes.push({
      id: `doublon:${lignes.map((ligne) => ligne.id).join(':')}`,
      code: 'doublon_possible',
      severite: 'attention',
      ligneId: lignes[0]?.id,
      produit: lignes[0]?.demande ?? '',
    });
  }

  for (const produit of brouillon.articlesNonTrouves) {
    problemes.push({
      id: `introuvable:${produit}`,
      code: 'produit_introuvable',
      severite: 'attention',
      produit,
    });
  }

  const bloquants = problemes.filter((probleme) => probleme.severite === 'bloquant');
  const attentions = problemes.filter((probleme) => probleme.severite === 'attention');
  return { problemes, bloquants, attentions, estPret: bloquants.length === 0 };
}
