import AsyncStorage from '@react-native-async-storage/async-storage';
import { memoriserAbonnementVerifie, lireAbonnementAvecGrace } from '@/lib/abonnementHorsLigne';

describe('abonnementHorsLigne', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.useRealTimers();
  });

  it('retourne null si aucun palier n\'a jamais ete memorise', async () => {
    expect(await lireAbonnementAvecGrace()).toBeNull();
  });

  it('retrouve le palier memorise dans la fenetre de grace', async () => {
    await memoriserAbonnementVerifie('premium');
    expect(await lireAbonnementAvecGrace()).toBe('premium');
  });

  it('retombe sur null au-dela de la fenetre de grace de 72h', async () => {
    const maintenant = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(maintenant);
    await memoriserAbonnementVerifie('famille');

    jest.spyOn(Date, 'now').mockReturnValue(maintenant + 73 * 60 * 60 * 1000);
    expect(await lireAbonnementAvecGrace()).toBeNull();

    jest.restoreAllMocks();
  });

  it('reste valable juste avant la fin de la fenetre de grace', async () => {
    const maintenant = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(maintenant);
    await memoriserAbonnementVerifie('standard');

    jest.spyOn(Date, 'now').mockReturnValue(maintenant + 71 * 60 * 60 * 1000);
    expect(await lireAbonnementAvecGrace()).toBe('standard');

    jest.restoreAllMocks();
  });
});
