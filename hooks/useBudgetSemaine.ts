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
import type { Commande } from '@/types';

const HISTORIQUE_AFFICHE = 5;

export function useBudgetSemaine(profilId: string | undefined) {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profilId) {
      setCommandes([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
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

  return { isLoading, budgetConsomme, economiesCumulees, dernieresCommandes, aDesCommandes: commandes.length > 0 };
}
