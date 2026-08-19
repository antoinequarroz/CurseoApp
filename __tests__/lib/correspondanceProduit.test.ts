import {
  calculerPaquets,
  classerSelonPreferences,
  comparerSubstitution,
  evaluerCorrespondance,
  normaliserProduit,
} from '@/lib/correspondanceProduit';
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

  it('normalise des synonymes sûrs mais signale les variantes contradictoires', () => {
    expect(normaliserProduit('Œufs frais')).toEqual(['oeuf', 'frai']);
    expect(evaluerCorrespondance('courgettes', 'Zucchini suisse')).toMatchObject({
      niveau: 'forte',
      validationRequise: false,
    });
    expect(evaluerCorrespondance('lait entier', 'Lait écrémé')).toMatchObject({
      niveau: 'faible',
      validationRequise: true,
      raisons: expect.arrayContaining(['variante_a_verifier']),
    });
  });

  it('compare le vrai coût et le nombre de paquets avant une substitution', () => {
    expect(
      comparerSubstitution(
        { quantite: 1, prixUnitaire: 3, besoinQuantite: 1500, besoinUnite: 'g', enseigne: 'migros' },
        { prix: 2.5, taille: { value: 1, unit: 'kg' }, enseigne: 'coop' },
      ),
    ).toEqual({
      nombrePaquets: 2,
      formatCompatible: true,
      ancienMontant: 3,
      nouveauMontant: 5,
      ecartMontant: 2,
      changeEnseigne: true,
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
