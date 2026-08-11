import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

/** Cache de lecture local : catalogue et semaines déjà consultées uniquement. */
export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'coursia_query_cache_v1',
  throttleTime: 1_000,
});

export const PERSISTED_QUERY_MAX_AGE = 7 * 24 * 60 * 60 * 1_000;
export const QUERY_CACHE_BUSTER = 'coursia-v1';

export function peutPersisterQuery(queryKey: readonly unknown[]): boolean {
  const domaine = queryKey[0];
  return domaine === 'recettes' || domaine === 'recette' || domaine === 'repas-semaine';
}
