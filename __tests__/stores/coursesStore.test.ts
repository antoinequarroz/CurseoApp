import { useCoursesStore } from '@/stores/coursesStore';
import {
  chargerDerniereListeCourses,
  enregistrerListeCourses,
} from '@/lib/coursesRepository';
import type { PlanningHebdomadaire, Recette } from '@/types';

jest.mock('@/lib/coursesRepository');

const chargerDerniereListeMock = chargerDerniereListeCourses as jest.Mock;
const enregistrerListeMock = enregistrerListeCourses as jest.Mock;

const recette: Recette = {
  id: 'r-1',
  titre: 'Riz',
  description: '',
  image_url: '',
  temps_preparation: 10,
  difficulte: 'facile',
  cout_estime: 3,
  calories: 200,
  portions: 2,
  regime: [],
  allergenes: [],
  ingredients: [{ nom: 'Riz', quantite: 200, unite: 'g', rayon: 'Epicerie' }],
  etapes: [],
  est_communautaire: false,
};

const planning: PlanningHebdomadaire = {
  lundi: { midi: { recette } },
  mardi: {},
  mercredi: {},
  jeudi: {},
  vendredi: {},
  samedi: {},
  dimanche: {},
};

describe('coursesStore', () => {
  beforeEach(() => {
    useCoursesStore.getState().reset();
    chargerDerniereListeMock.mockReset();
    enregistrerListeMock.mockReset();
  });

  it('genere la liste depuis un planning', () => {
    useCoursesStore.getState().genererDepuisPlanning(planning, { nb_personnes: 2 });
    expect(useCoursesStore.getState().items).toHaveLength(1);
  });

  it('toggle l\'etat coche d\'un item', () => {
    useCoursesStore.getState().genererDepuisPlanning(planning, { nb_personnes: 2 });
    const id = useCoursesStore.getState().items[0]!.id;
    useCoursesStore.getState().toggleCoche(id);
    expect(useCoursesStore.getState().items[0]?.coche).toBe(true);
  });

  it('preserve les articles ajoutes a la main lors d une regeneration', () => {
    useCoursesStore.getState().ajouterItemLibre('Papier toilette', 'Hygiene');
    useCoursesStore.getState().genererDepuisPlanning(planning, { nb_personnes: 2 });

    expect(useCoursesStore.getState().items.map((item) => item.produit)).toEqual(['Riz', 'Papier toilette']);
  });

  it('une regeneration vide retire les anciens ingredients mais garde les articles libres', () => {
    useCoursesStore.getState().genererDepuisPlanning(planning, { nb_personnes: 2 });
    useCoursesStore.getState().ajouterItemLibre('Savon', 'Hygiene');
    useCoursesStore.getState().genererDepuisPlanning(
      { lundi: {}, mardi: {}, mercredi: {}, jeudi: {}, vendredi: {}, samedi: {}, dimanche: {} },
      { nb_personnes: 2 },
    );

    expect(useCoursesStore.getState().items.map((item) => item.produit)).toEqual(['Savon']);
  });

  it('COUR-53 : restaure la derniere liste distante quand aucun changement local n existe', async () => {
    chargerDerniereListeMock.mockResolvedValue({
      id: 'liste-distante',
      planningId: 'planning-1',
      items: [{ id: 'pomme', produit: 'Pommes', quantite: 2, unite: 'unite', rayon: 'Fruits & Legumes', coche: false }],
    });

    await expect(useCoursesStore.getState().chargerDepuisSupabase('u-1')).resolves.toBe(true);
    expect(useCoursesStore.getState()).toMatchObject({
      listeId: 'liste-distante',
      planningId: 'planning-1',
      syncEnAttente: false,
    });
    expect(useCoursesStore.getState().items[0]?.produit).toBe('Pommes');
  });

  it('COUR-53 : une action locale pendant le chargement distant reste prioritaire', async () => {
    let terminerChargement!: (value: unknown) => void;
    chargerDerniereListeMock.mockReturnValue(new Promise((resolve) => { terminerChargement = resolve; }));

    const chargement = useCoursesStore.getState().chargerDepuisSupabase('u-1');
    useCoursesStore.getState().ajouterItemLibre('Savon', 'Hygiene');
    terminerChargement({ id: 'ancienne', planningId: null, items: [] });
    await chargement;

    expect(useCoursesStore.getState().items.map((item) => item.produit)).toEqual(['Savon']);
    expect(useCoursesStore.getState().listeId).toBeNull();
    expect(useCoursesStore.getState().syncEnAttente).toBe(true);
  });

  it('COUR-53 : propage aussi la suppression du dernier article', async () => {
    useCoursesStore.setState({
      listeId: 'liste-1',
      items: [{ id: 'pomme', produit: 'Pommes', quantite: 1, unite: 'unite', rayon: 'Fruits & Legumes', coche: false }],
    });
    useCoursesStore.getState().retirerItem('pomme');
    enregistrerListeMock.mockResolvedValue('liste-1');

    await useCoursesStore.getState().syncerAvecSupabase('u-1');

    expect(enregistrerListeMock).toHaveBeenCalledWith(expect.objectContaining({ listeId: 'liste-1', items: [] }));
    expect(useCoursesStore.getState().syncEnAttente).toBe(false);
  });

  it('COUR-53 : conserve en attente une modification faite pendant un envoi', async () => {
    let terminerEnvoi!: (value: string) => void;
    enregistrerListeMock.mockReturnValue(new Promise((resolve) => { terminerEnvoi = resolve; }));
    useCoursesStore.getState().ajouterItemLibre('Pommes', 'Fruits & Legumes');

    const envoi = useCoursesStore.getState().syncerAvecSupabase('u-1');
    useCoursesStore.getState().ajouterItemLibre('Pain', 'Epicerie');
    terminerEnvoi('liste-1');
    await envoi;

    expect(useCoursesStore.getState()).toMatchObject({
      listeId: 'liste-1',
      syncEnAttente: true,
      erreurSynchronisation: false,
    });
  });

  it('COUR-53 : garde la liste locale et expose une reprise si Supabase echoue', async () => {
    useCoursesStore.getState().ajouterItemLibre('Pain', 'Epicerie');
    enregistrerListeMock.mockRejectedValue(new Error('reseau'));

    await expect(useCoursesStore.getState().syncerAvecSupabase('u-1')).resolves.toBe(false);
    expect(useCoursesStore.getState()).toMatchObject({
      syncEnAttente: true,
      erreurSynchronisation: true,
      syncing: false,
    });
    expect(useCoursesStore.getState().items[0]?.produit).toBe('Pain');
  });

  it('COUR-53 : ignore une reponse reseau recue apres la deconnexion', async () => {
    let terminerEnvoi!: (value: string) => void;
    enregistrerListeMock.mockReturnValue(new Promise((resolve) => { terminerEnvoi = resolve; }));
    useCoursesStore.getState().ajouterItemLibre('Pain', 'Epicerie');

    const envoi = useCoursesStore.getState().syncerAvecSupabase('u-1');
    useCoursesStore.getState().reset();
    terminerEnvoi('liste-ancien-compte');
    await envoi;

    expect(useCoursesStore.getState()).toMatchObject({
      items: [],
      listeId: null,
      syncEnAttente: false,
      syncing: false,
    });
  });
});
