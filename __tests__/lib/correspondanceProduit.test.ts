import { calculerPaquets, classerSelonPreferences, evaluerCorrespondance } from '@/lib/correspondanceProduit';
import { PREFERENCES_COURSES_DEFAUT } from '@/lib/preferencesCoursesRepository';

describe('correspondanceProduit', () => {
  it('estime la pertinence sans la présenter comme un score fournisseur', () => {
    expect(evaluerCorrespondance('tomates cerises', 'Tomates cerises bio')).toMatchObject({
      niveau: 'forte',
      validationRequise: false,
    });
    expect(evaluerCorrespondance('papier cuisson', 'Papier ménage')).toMatchObject({
      niveau: 'moyenne',
      validationRequise: false,
    });
    expect(evaluerCorrespondance('lait entier', 'Boisson avoine')).toMatchObject({
      niveau: 'faible',
      validationRequise: true,
    });
  });

  it('convertit masse, volume et pièces en nombre de paquets', () => {
    expect(calculerPaquets({ quantite: 1500, unite: 'g' }, { value: 1, unit: 'kg' })).toEqual({
      nombrePaquets: 2,
      formatCompatible: true,
    });
    expect(calculerPaquets({ quantite: 750, unite: 'ml' }, { value: 50, unit: 'cl' })).toEqual({
      nombrePaquets: 2,
      formatCompatible: true,
    });
    expect(calculerPaquets({ quantite: 7, unite: 'piece' }, { value: 6, unit: 'piece' })).toEqual({
      nombrePaquets: 2,
      formatCompatible: true,
    });
  });

  it('retire une marque refusée et place une marque préférée en premier', () => {
    const preferences = {
      ...PREFERENCES_COURSES_DEFAUT,
      marquesPreferees: ['Bio'],
      marquesRefusees: ['Non'],
    };
    expect(
      classerSelonPreferences(
        [
          { marque: 'Budget', prix: 1 },
          { marque: 'Bio', prix: 3 },
          { marque: 'Non', prix: 0.5 },
        ],
        preferences,
      ),
    ).toEqual([
      { marque: 'Bio', prix: 3 },
      { marque: 'Budget', prix: 1 },
    ]);
  });
});
