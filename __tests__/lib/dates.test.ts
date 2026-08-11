import { dates } from '@/lib/dates';

describe('dates (COUR-27)', () => {
  it('versISO : formate en yyyy-MM-dd', () => {
    expect(dates.versISO(new Date(2026, 6, 25))).toBe('2026-07-25');
  });

  it('finSemaine : dimanche de la semaine, 6 jours apres debutSemaine', () => {
    const lundi = dates.debutSemaine(new Date(2026, 6, 22)); // mercredi 22 juillet 2026
    const dimanche = dates.finSemaine(lundi);
    expect(dates.versISO(lundi)).toBe('2026-07-20');
    expect(dates.versISO(dimanche)).toBe('2026-07-26');
  });

  it('ajouterSemaines : navigue vers la semaine precedente/suivante sans changer le jour de la semaine', () => {
    const lundi = dates.debutSemaine(new Date(2026, 6, 20));
    const semaineSuivante = dates.ajouterSemaines(lundi, 1);
    const semainePrecedente = dates.ajouterSemaines(lundi, -1);
    expect(dates.versISO(semaineSuivante)).toBe('2026-07-27');
    expect(dates.versISO(semainePrecedente)).toBe('2026-07-13');
  });

  it('estMemeSemaine : deux dates de la meme semaine lundi-dimanche', () => {
    const lundi = new Date(2026, 6, 20);
    const dimanche = new Date(2026, 6, 26);
    const lundiSuivant = new Date(2026, 6, 27);
    expect(dates.estMemeSemaine(lundi, dimanche)).toBe(true);
    expect(dates.estMemeSemaine(lundi, lundiSuivant)).toBe(false);
  });

  it('dateDuJour : deduit la date reelle d\'un JourSemaine dans une semaine donnee', () => {
    const lundi = dates.debutSemaine(new Date(2026, 6, 20));
    expect(dates.versISO(dates.dateDuJour(lundi, 'lundi'))).toBe('2026-07-20');
    expect(dates.versISO(dates.dateDuJour(lundi, 'mercredi'))).toBe('2026-07-22');
    expect(dates.versISO(dates.dateDuJour(lundi, 'dimanche'))).toBe('2026-07-26');
  });

  it('jourSemaineDepuisISO : deduit le JourSemaine a partir d\'une date calendaire pure', () => {
    expect(dates.jourSemaineDepuisISO('2026-07-20')).toBe('lundi');
    expect(dates.jourSemaineDepuisISO('2026-07-22')).toBe('mercredi');
    expect(dates.jourSemaineDepuisISO('2026-07-26')).toBe('dimanche');
  });

  it('formatDateHeureCourte : affiche une collecte en heure suisse', () => {
    expect(dates.formatDateHeureCourte(new Date('2026-08-10T12:34:00.000Z'))).toBe('10 août à 14:34');
  });
});
