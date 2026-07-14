/**
 * Evenements analytics typees (PostHog). Jamais d'appel direct a PostHog
 * dans les composants — tout passe par ces fonctions pour garder un
 * vocabulaire d'evenements coherent et audite.
 */
import PostHog from 'posthog-react-native';
import Constants from 'expo-constants';

let client: PostHog | null = null;

export function initAnalytics(): void {
  const apiKey = Constants.expoConfig?.extra?.posthogApiKey as string | undefined;
  if (!apiKey) {
    console.warn('[analytics] POSTHOG_API_KEY manquant — analytics desactives.');
    return;
  }
  client = new PostHog(apiKey, { host: 'https://eu.posthog.com' });
}

type PropertiesEvenement = Record<string, string | number | boolean>;

function track(event: string, properties?: PropertiesEvenement): void {
  client?.capture(event, properties);
}

export const analytics = {
  onboardingCompleted: () => track('onboarding_completed'),
  onboardingStepAbandoned: (etape: number) => track('onboarding_step_abandoned', { etape }),
  recipeSwipedLike: (recetteId: string) => track('recipe_swiped_like', { recetteId }),
  recipeSwipedPass: (recetteId: string) => track('recipe_swiped_pass', { recetteId }),
  planningGenerated: () => track('planning_generated'),
  shoppingListGenerated: (nbItems: number) => track('shopping_list_generated', { nbItems }),
  paywallShown: (feature: string) => track('paywall_shown', { feature }),
  subscriptionStarted: (palier: string) => track('subscription_started', { palier }),
  subscriptionCancelled: (palier: string) => track('subscription_cancelled', { palier }),
};
