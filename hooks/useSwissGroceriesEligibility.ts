import { useQuery } from '@tanstack/react-query';
import {
  fetchSwissGroceriesEligibility,
  swissGroceriesBuildEnabled,
} from '@/lib/swissGroceriesRepository';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useProfilStore } from '@/stores/profilStore';

export function useSwissGroceriesEligibility() {
  const profilId = useProfilStore((state) => state.profil?.id);
  const query = useQuery({
    queryKey: ['swissgroceries', 'eligibility', profilId],
    queryFn: fetchSwissGroceriesEligibility,
    enabled: swissGroceriesBuildEnabled && isSupabaseConfigured && Boolean(profilId),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return {
    eligible: swissGroceriesBuildEnabled && query.data === true,
    isLoading: swissGroceriesBuildEnabled && Boolean(profilId) && query.isLoading,
  };
}
