/** Point d'entree — redirige vers l'onboarding s'il n'est pas termine, sinon vers les tabs. */
import { Redirect } from 'expo-router';
import { useOnboardingStore } from '@/stores/onboardingStore';

export default function Index() {
  const estComplete = useOnboardingStore((s) => s.estComplete);
  return <Redirect href={estComplete ? '/(tabs)' : '/(auth)/onboarding'} />;
}
