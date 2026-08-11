/** Toutes les dates de l'app sont ancrees sur Europe/Zurich — jamais `new Date()` direct dans les composants. */
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format, startOfWeek, startOfMonth, getDay, addDays, addWeeks, isSameWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { JOURS_SEMAINE, type JourSemaine } from '@/types';

const TZ = 'Europe/Zurich';

export const dates = {
  maintenant: () => toZonedTime(new Date(), TZ),
  debutSemaine: (d: Date) => startOfWeek(toZonedTime(d, TZ), { weekStartsOn: 1 }),
  /** Dimanche de la semaine (COUR-27) — debutSemaine + 6 jours. */
  finSemaine: (d: Date) => addDays(startOfWeek(toZonedTime(d, TZ), { weekStartsOn: 1 }), 6),
  debutMois: (d: Date) => startOfMonth(toZonedTime(d, TZ)),
  formatJour: (d: Date) => format(toZonedTime(d, TZ), 'EEEE d MMMM', { locale: fr }),
  formatCourt: (d: Date) => format(toZonedTime(d, TZ), 'EEE d', { locale: fr }),
  /** Horodatage court lisible pour une donnée volatile, toujours en heure suisse. */
  formatDateHeureCourte: (d: Date) => format(toZonedTime(d, TZ), "d MMM 'à' HH:mm", { locale: fr }),
  versUTC: (d: Date) => fromZonedTime(d, TZ),
  /** Cle JourSemaine ('lundi'..'dimanche') du jour donne — getDay() renvoie 0=dimanche. */
  jourSemaine: (d: Date): JourSemaine => JOURS_SEMAINE[(getDay(toZonedTime(d, TZ)) + 6) % 7]!,
  /** N semaines avant/apres (COUR-27, navigation planning) — n negatif = semaines precedentes. */
  ajouterSemaines: (d: Date, n: number) => addWeeks(d, n),
  /** true si `d` tombe dans la meme semaine (lundi-dimanche) que `reference`. */
  estMemeSemaine: (d: Date, reference: Date) => isSameWeek(d, reference, { weekStartsOn: 1 }),
  /** Format ISO `yyyy-MM-dd` — colonnes `date` Supabase et cles de requete (jamais un format localise pour ca). */
  versISO: (d: Date) => format(toZonedTime(d, TZ), 'yyyy-MM-dd'),
  /** Date reelle d'un JourSemaine au sein de la semaine commencant a `semaineDebut` (lundi). */
  dateDuJour: (semaineDebut: Date, jour: JourSemaine) => addDays(semaineDebut, JOURS_SEMAINE.indexOf(jour)),
  /**
   * JourSemaine a partir d'une date calendaire pure `yyyy-MM-dd` (colonne
   * `date` Supabase, sans heure). Arithmetique locale sur les composants
   * Y/M/D plutot qu'un passage par `jourSemaine()`/`toZonedTime` : une date
   * sans heure n'a pas de fuseau a corriger, et parser la chaine ISO avec
   * `new Date(iso)` l'interpreterait a tort en UTC (decalage possible d'un
   * jour selon le fuseau de l'appareil).
   */
  jourSemaineDepuisISO: (iso: string): JourSemaine => {
    const [annee, mois, jour] = iso.split('-').map(Number);
    const jourSemaineIndex = new Date(annee!, mois! - 1, jour!).getDay();
    return JOURS_SEMAINE[(jourSemaineIndex + 6) % 7]!;
  },
};
