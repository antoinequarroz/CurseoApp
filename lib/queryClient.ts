/** Client React Query global — offline-first, retry avec backoff, gestion d'erreur centralisee. */
import { QueryClient } from '@tanstack/react-query';
import { isSupabaseError } from './supabase';
import { toast } from './toast';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      staleTime: 5 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 1,
      onError: (error) => handleGlobalMutationError(error),
    },
  },
});

const MESSAGES_ERREUR: Record<string, string> = {
  PGRST116: 'Données introuvables',
  '23505': 'Ces données existent déjà',
  '42501': 'Accès non autorisé',
};

function handleGlobalMutationError(error: unknown): void {
  if (isSupabaseError(error)) {
    toast.erreur(MESSAGES_ERREUR[error.code] ?? 'Une erreur est survenue, réessaie dans un moment');
    return;
  }
  toast.erreur('Une erreur est survenue, réessaie dans un moment');
}
