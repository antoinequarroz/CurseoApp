import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enregistrerPreferencesCourses, fetchPreferencesCourses } from '@/lib/preferencesCoursesRepository';
import type { PreferencesCoursesEnLigne } from '@/types';

export function usePreferencesCourses(profilId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['preferences-courses-en-ligne', profilId] as const;
  const query = useQuery({
    queryKey,
    queryFn: () => fetchPreferencesCourses(profilId as string),
    enabled: Boolean(profilId),
  });
  const mutation = useMutation({
    mutationFn: (preferences: PreferencesCoursesEnLigne) =>
      enregistrerPreferencesCourses(profilId as string, preferences),
    onSuccess: (preferences) => queryClient.setQueryData(queryKey, preferences),
  });
  return { ...query, enregistrer: mutation.mutateAsync, enregistrementEnCours: mutation.isPending };
}
