/** Toutes les dates de l'app sont ancrees sur Europe/Zurich — jamais `new Date()` direct dans les composants. */
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format, startOfWeek, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { JOURS_SEMAINE, type JourSemaine } from '@/types';

const TZ = 'Europe/Zurich';

export const dates = {
  maintenant: () => toZonedTime(new Date(), TZ),
  debutSemaine: (d: Date) => startOfWeek(toZonedTime(d, TZ), { weekStartsOn: 1 }),
  formatJour: (d: Date) => format(toZonedTime(d, TZ), 'EEEE d MMMM', { locale: fr }),
  formatCourt: (d: Date) => format(toZonedTime(d, TZ), 'EEE d', { locale: fr }),
  versUTC: (d: Date) => fromZonedTime(d, TZ),
  /** Cle JourSemaine ('lundi'..'dimanche') du jour donne — getDay() renvoie 0=dimanche. */
  jourSemaine: (d: Date): JourSemaine => JOURS_SEMAINE[(getDay(toZonedTime(d, TZ)) + 6) % 7]!,
};
