/** Toutes les dates de l'app sont ancrees sur Europe/Zurich — jamais `new Date()` direct dans les composants. */
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

const TZ = 'Europe/Zurich';

export const dates = {
  maintenant: () => toZonedTime(new Date(), TZ),
  debutSemaine: (d: Date) => startOfWeek(toZonedTime(d, TZ), { weekStartsOn: 1 }),
  formatJour: (d: Date) => format(toZonedTime(d, TZ), 'EEEE d MMMM', { locale: fr }),
  formatCourt: (d: Date) => format(toZonedTime(d, TZ), 'EEE d', { locale: fr }),
  versUTC: (d: Date) => fromZonedTime(d, TZ),
};
