/**
 * Charge les commandes d'un profil et en deduit :
 * - budgetConsomme : uniquement les commandes de la semaine en cours (pour le
 *   donut "budget hebdomadaire")
 * - economiesCumulees : la somme sur TOUTES les commandes (pas seulement les
 *   5 dernieres) — "cumulees" n'a pas de sens limite a un echantillon
 * - dernieresCommandes : les 5 plus recentes, pour l'historique affiche
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { dates } from '@/lib/dates';
import type { Commande, Enseigne } from '@/types';

const HISTORIQUE_AFFICHE = 5;

export function useBudgetSemaine(profilId: string | undefined) {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(profilId));
  // Reinitialise quand profilId disparait (deconnexion) — ajustement pendant
  // le rendu plutot qu'un setState dans un effet (evite les rendus en cascade).
  const [profilIdPrecedent, setProfilIdPrecedent] = useState(profilId);
  if (profilId !== profilIdPrecedent) {
    setProfilIdPrecedent(profilId);
    setIsLoading(Boolean(profilId));
    if (!profilId) setCommandes([]);
  }

  useEffect(() => {
    if (!profilId) return;
    void (async () => {
      try {
        const { data } = await supabase
          .from('commandes')
          .select('*')
          .eq('profil_id', profilId)
          .order('created_at', { ascending: false });
        setCommandes((data as Commande[] | null) ?? []);
      } catch {
        setCommandes([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [profilId]);

  const debutSemaine = dates.versUTC(dates.debutSemaine(dates.maintenant()));
  const budgetConsomme = commandes
    .filter((c) => new Date(c.created_at) >= debutSemaine)
    .reduce((total, c) => total + c.montant_total, 0);
  const economiesCumulees = commandes.reduce((total, c) => total + c.economies, 0);
  const dernieresCommandes = commandes.slice(0, HISTORIQUE_AFFICHE);

  // Enseigne la moins chere ce mois-ci, toutes commandes confondues — seule
  // metrique deductible des donnees existantes (pas de tracking par enseigne
  // en base au-dela des paniers de chaque commande). Comparaison par plage de
  // dates UTC (comme budgetConsomme ci-dessus) plutot que getMonth()/getFullYear()
  // sur un Date "zone Zurich" : ces getters locaux reappliqueraient le decalage
  // du fuseau systeme par-dessus celui deja applique par dates.maintenant(),
  // ce qui pouvait mal classer une commande pres d'une frontiere de mois.
  const debutMois = dates.versUTC(dates.debutMois(dates.maintenant()));
  const finMois = new Date(debutMois);
  finMois.setUTCMonth(finMois.getUTCMonth() + 1);
  const totauxParEnseigne = new Map<Enseigne, number>();
  for (const c of commandes) {
    const dateCommande = new Date(c.created_at);
    if (dateCommande < debutMois || dateCommande >= finMois) continue;
    for (const panier of c.paniers) {
      totauxParEnseigne.set(panier.enseigne, (totauxParEnseigne.get(panier.enseigne) ?? 0) + panier.montant);
    }
  }
  let meilleureEnseigne: Enseigne | null = null;
  let montantMinimum = Infinity;
  for (const [enseigne, montant] of totauxParEnseigne) {
    if (montant < montantMinimum) {
      montantMinimum = montant;
      meilleureEnseigne = enseigne;
    }
  }

  return {
    isLoading,
    budgetConsomme,
    economiesCumulees,
    dernieresCommandes,
    meilleureEnseigne,
    aDesCommandes: commandes.length > 0,
  };
}
