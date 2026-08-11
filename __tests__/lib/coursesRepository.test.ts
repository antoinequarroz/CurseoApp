import {
  chargerDerniereListeCourses,
  enregistrerListeCourses,
} from '@/lib/coursesRepository';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));

const fromMock = supabase.from as jest.Mock;
const item = {
  id: 'pain',
  produit: 'Pain',
  quantite: 1,
  unite: 'unite',
  rayon: 'Epicerie' as const,
  coche: false,
};

describe('coursesRepository', () => {
  beforeEach(() => fromMock.mockReset());

  it('charge et normalise la derniere liste du profil', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { id: 'liste-1', planning_id: 'planning-1', items: [item] },
      error: null,
    });
    const limit = jest.fn(() => ({ maybeSingle }));
    const order = jest.fn(() => ({ limit }));
    const eq = jest.fn(() => ({ order }));
    const select = jest.fn(() => ({ eq }));
    fromMock.mockReturnValue({ select });

    await expect(chargerDerniereListeCourses('u-1')).resolves.toEqual({
      id: 'liste-1',
      planningId: 'planning-1',
      items: [item],
    });
    expect(eq).toHaveBeenCalledWith('profil_id', 'u-1');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('retourne null quand le profil n a encore aucune liste', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    fromMock.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({ limit: jest.fn(() => ({ maybeSingle })) })),
        })),
      })),
    });

    await expect(chargerDerniereListeCourses('u-1')).resolves.toBeNull();
  });

  it('met a jour une liste existante, y compris avec zero article', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn(() => ({ eq }));
    fromMock.mockReturnValue({ update });

    await expect(enregistrerListeCourses({
      profilId: 'u-1',
      listeId: 'liste-1',
      planningId: null,
      items: [],
    })).resolves.toBe('liste-1');
    expect(update).toHaveBeenCalledWith({ items: [], planning_id: null });
    expect(eq).toHaveBeenCalledWith('id', 'liste-1');
  });

  it('cree la premiere liste et renvoie son identifiant', async () => {
    const single = jest.fn().mockResolvedValue({ data: { id: 'liste-2' }, error: null });
    const select = jest.fn(() => ({ single }));
    const insert = jest.fn(() => ({ select }));
    fromMock.mockReturnValue({ insert });

    await expect(enregistrerListeCourses({
      profilId: 'u-1',
      listeId: null,
      planningId: 'planning-1',
      items: [item],
    })).resolves.toBe('liste-2');
    expect(insert).toHaveBeenCalledWith({
      profil_id: 'u-1',
      planning_id: 'planning-1',
      items: [item],
    });
  });

  it('propage une erreur Supabase sans modifier les donnees', async () => {
    const erreur = new Error('indisponible');
    const eq = jest.fn().mockResolvedValue({ error: erreur });
    fromMock.mockReturnValue({ update: jest.fn(() => ({ eq })) });

    await expect(enregistrerListeCourses({
      profilId: 'u-1',
      listeId: 'liste-1',
      planningId: null,
      items: [item],
    })).rejects.toBe(erreur);
  });
});
