import type { BrouillonPanierLive, CreneauLivraisonDemo, LivraisonDemo } from '@/stores/panierLiveStore';
import { sousTotalPanier } from '@/stores/panierLiveStore';
import type { CreneauLivraisonPrefere, Enseigne } from '@/types';

const SEUIL_GRATUITE = 80;
const FRAIS_STANDARD = 7.9;
const HEURES = {
  matin: [9, 11],
  apres_midi: [14, 16],
  soir: [18, 20],
} as const;

function isoAvecHeure(jour: Date, heure: number): string {
  const date = new Date(jour);
  date.setHours(heure, 0, 0, 0);
  return date.toISOString();
}

/** Créneaux fictifs stables pour une journée donnée, jamais issus d'une enseigne. */
export function genererCreneauxLivraisonDemo(
  enseigne: Enseigne,
  reference = new Date(),
): CreneauLivraisonDemo[] {
  const creneaux: CreneauLivraisonDemo[] = [];
  for (const decalage of [1, 2]) {
    const jour = new Date(reference);
    jour.setDate(jour.getDate() + decalage);
    for (const periode of ['matin', 'apres_midi', 'soir'] as const) {
      const [debut, fin] = HEURES[periode];
      const date = jour.toISOString().slice(0, 10);
      creneaux.push({
        id: `demo-${enseigne}-${date}-${periode}`,
        debut: isoAvecHeure(jour, debut),
        fin: isoAvecHeure(jour, fin),
        periode,
      });
    }
  }
  return creneaux;
}

/** Valeurs fictives stables : elles servent uniquement à tester le checkout. */
export function genererLivraisonsDemo(
  brouillon: BrouillonPanierLive,
  selections: Partial<Record<Enseigne, string>> = {},
  preference: CreneauLivraisonPrefere = 'indifferent',
  reference = new Date(),
): LivraisonDemo[] {
  return brouillon.paniers.map((panier) => {
    const options = genererCreneauxLivraisonDemo(panier.enseigne, reference);
    const creneau =
      options.find((option) => option.id === selections[panier.enseigne]) ??
      options.find((option) => preference !== 'indifferent' && option.periode === preference) ??
      options[0]!;
    return {
      enseigne: panier.enseigne,
      id: `demo-standard-${panier.enseigne}`,
      libelle: 'standard_demo',
      prix: sousTotalPanier(panier) >= SEUIL_GRATUITE ? 0 : FRAIS_STANDARD,
      creneau,
    };
  });
}
