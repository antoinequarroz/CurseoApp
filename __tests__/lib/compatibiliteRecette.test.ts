import { filtrerParContraintes, resoudreAllergie, normaliserAllergie } from '@/lib/compatibiliteRecette';
import type { Recette } from '@/types';

function recette(overrides: Partial<Recette>): Recette {
  return {
    id: 'r-1',
    titre: 'Recette test',
    description: '',
    image_url: '',
    temps_preparation: 20,
    difficulte: 'facile',
    cout_estime: 10,
    calories: 400,
    portions: 2,
    regime: [],
    allergenes: [],
    ingredients: [],
    etapes: [],
    est_communautaire: false,
    ...overrides,
  };
}

const SYNONYMES = new Map<string, string>([
  ['arachide', 'arachide'],
  ['cacahuete', 'arachide'],
  ['gluten', 'gluten'],
  ['ble', 'gluten'],
]);

describe('filtrerParContraintes', () => {
  it('sans contrainte : toutes les recettes passent', () => {
    const source = [recette({ id: 'r-1' }), recette({ id: 'r-2' })];
    const resultat = filtrerParContraintes(source, [], [], null);
    expect(resultat.recettes).toHaveLength(2);
  });

  it('regime : une recette doit satisfaire TOUS les regimes requis (intersection, pas juste un seul en commun)', () => {
    const source = [
      recette({ id: 'vegetarien-seul', regime: ['vegetarien'] }),
      recette({ id: 'vegetarien-et-sans-gluten', regime: ['vegetarien', 'sans_gluten'] }),
    ];
    const resultat = filtrerParContraintes(source, ['vegetarien', 'sans_gluten'], [], null);
    expect(resultat.recettes.map((r) => r.id)).toEqual(['vegetarien-et-sans-gluten']);
  });

  it("contraintes contradictoires de plusieurs membres : aucune recette ne satisfait tout le monde -> liste vide, pas d'erreur", () => {
    const source = [
      recette({ id: 'vegetarien-uniquement', regime: ['vegetarien'] }),
      recette({ id: 'halal-uniquement', regime: ['halal'] }),
    ];
    // Un membre vegetarien + un membre halal, requis simultanement : aucune
    // recette du catalogue ne porte les deux tags a la fois.
    const resultat = filtrerParContraintes(source, ['vegetarien', 'halal'], [], null);
    expect(resultat.recettes).toEqual([]);
  });

  it('allergie confirmee : recette exclue, jamais proposee comme sure', () => {
    const source = [
      recette({ id: 'avec-gluten', allergenesEffectifs: [{ code: 'gluten', libelle: 'Gluten', source: 'declare', certitude: 'confirme' }] }),
      recette({ id: 'sans-allergene' }),
    ];
    const resultat = filtrerParContraintes(source, [], ['gluten'], SYNONYMES);
    expect(resultat.recettes.map((r) => r.id)).toEqual(['sans-allergene']);
  });

  it('allergie "possible" (deduction ambigue) : jamais exclue, mais toujours signalee', () => {
    const source = [
      recette({ id: 'possible', allergenesEffectifs: [{ code: 'gluten', libelle: 'Gluten', source: 'deduit', certitude: 'possible' }] }),
    ];
    const resultat = filtrerParContraintes(source, [], ['gluten'], SYNONYMES);
    expect(resultat.recettes.map((r) => r.id)).toEqual(['possible']);
    expect(resultat.alertesParRecette['possible']).toEqual([{ code: 'gluten', libelle: 'Gluten' }]);
  });

  it('allergies de plusieurs membres unies : exclue si un allergene confirme correspond a N\'IMPORTE laquelle', () => {
    const source = [
      recette({ id: 'avec-arachide', allergenesEffectifs: [{ code: 'arachide', libelle: 'Arachides', source: 'declare', certitude: 'confirme' }] }),
      recette({ id: 'avec-gluten', allergenesEffectifs: [{ code: 'gluten', libelle: 'Gluten', source: 'declare', certitude: 'confirme' }] }),
      recette({ id: 'sans-allergene' }),
    ];
    // Membre A allergique aux cacahuetes, membre B allergique au gluten.
    const resultat = filtrerParContraintes(source, [], ['cacahuete', 'ble'], SYNONYMES);
    expect(resultat.recettes.map((r) => r.id)).toEqual(['sans-allergene']);
  });

  it('regime ET allergies combines pour plusieurs membres : intersection stricte sur les deux axes', () => {
    const source = [
      recette({ id: 'ok', regime: ['vegetarien', 'sans_gluten'] }),
      recette({ id: 'pas-sans-gluten', regime: ['vegetarien'] }),
      recette({ id: 'contient-arachide', regime: ['vegetarien', 'sans_gluten'], allergenesEffectifs: [{ code: 'arachide', libelle: 'Arachides', source: 'declare', certitude: 'confirme' }] }),
    ];
    const resultat = filtrerParContraintes(source, ['vegetarien', 'sans_gluten'], ['arachide'], SYNONYMES);
    expect(resultat.recettes.map((r) => r.id)).toEqual(['ok']);
  });

  it('allergie non reconnue par le referentiel : signalee separement, ne filtre rien pour ce terme', () => {
    const source = [recette({ id: 'r-1' })];
    const resultat = filtrerParContraintes(source, [], ['terme_totalement_inconnu'], SYNONYMES);
    expect(resultat.allergiesNonReconnues).toEqual(['terme_totalement_inconnu']);
    expect(resultat.recettes.map((r) => r.id)).toEqual(['r-1']);
  });
});

describe('resoudreAllergie / normaliserAllergie', () => {
  it('resout un synonyme accentue/majuscule vers le code canonique', () => {
    expect(resoudreAllergie('Cacahuète', SYNONYMES)).toBe('arachide');
  });

  it('mode degrade (synonymes=null) : retombe sur la comparaison normalisee exacte', () => {
    expect(resoudreAllergie('Gluten', null)).toBe(normaliserAllergie('Gluten'));
  });
});
