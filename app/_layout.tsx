/**
 * Layout racine. Garde le splash visible jusqu'a ce que fonts + session +
 * theme soient charges — evite tout flash au demarrage (voir brief point 15).
 */
import 'react-native-url-polyfill/auto';
import '../global.css';
import { Sentry } from '../lib/sentry';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import Toast from 'react-native-toast-message';
import { useFonts as useDMMonoFonts, DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import { ThemeProvider } from '@/lib/theme-context';
import { queryClient } from '@/lib/queryClient';
import {
  peutPersisterQuery,
  PERSISTED_QUERY_MAX_AGE,
  QUERY_CACHE_BUSTER,
  queryPersister,
} from '@/lib/queryPersistence';
import { supabase } from '@/lib/supabase';
import { initRevenueCat, ecouterMisesAJourAbonnement } from '@/lib/revenuecat';
import { lireAbonnementAvecGrace } from '@/lib/abonnementHorsLigne';
import { useProfilStore } from '@/stores/profilStore';
import { useWhatsNew } from '@/lib/whatsNew';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SessionGuard } from '@/components/SessionGuard';
import { WhatsNewModal } from '@/components/ui/WhatsNewModal';
import { t } from '@/lib/i18n';

SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const profil = useProfilStore((state) => state.profil);
  const { shouldShow: shouldShowWhatsNew, currentRelease, markAsSeen } = useWhatsNew();
  const [fontsLoaded] = useDMMonoFonts({ DMMono_400Regular, DMMono_500Medium });

  useEffect(() => {
    async function prepare() {
      if (!fontsLoaded) return;
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          const { data: profil } = await supabase
            .from('profils')
            .select('*')
            .eq('id', data.session.user.id)
            .single();
          if (profil) useProfilStore.getState().setProfil(profil);
          // COUR-32 : identifie l'utilisateur aupres du SDK RevenueCat des que
          // connu, avant tout achat possible (paywall accessible des les tabs).
          initRevenueCat(data.session.user.id);
        }
      } catch (error) {
        console.warn('[startup] Initialisation session/profil ignoree.', error);
        // COUR-33 : le fetch du profil a echoue (le plus souvent hors-ligne)
        // — repli sur le dernier palier confirme avec succes s'il est encore
        // dans la fenetre de grace de 72h, plutot que de laisser
        // useAbonnement retomber silencieusement sur 'gratuit' pour un
        // abonne payant reel. Voir lib/abonnementHorsLigne.ts.
        const niveauGrace = await lireAbonnementAvecGrace();
        if (niveauGrace) useProfilStore.getState().setAbonnementHorsLigne(niveauGrace);
      }
      setAppReady(true);
    }
    void prepare();
  }, [fontsLoaded]);

  // COUR-32 critere 3/4 : tout changement d'entitlements RevenueCat (achat,
  // restauration, renouvellement/expiration synchronises par le SDK en tache
  // de fond) met a jour l'abonnement affiche immediatement, sans redemarrage
  // — purement local, le webhook reste la source de verite persistee.
  useEffect(() => {
    const arreter = ecouterMisesAJourAbonnement((niveau) => {
      useProfilStore.getState().refleterAbonnementLocal(niveau);
    });
    return arreter;
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appReady) await SplashScreen.hideAsync();
  }, [appReady]);

  if (!appReady) return null;

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
              persister: queryPersister,
              maxAge: PERSISTED_QUERY_MAX_AGE,
              buster: QUERY_CACHE_BUSTER,
              dehydrateOptions: {
                shouldDehydrateQuery: (query) =>
                  query.state.status === 'success' && peutPersisterQuery(query.queryKey),
              },
            }}
          >
            <ThemeProvider>
              <ErrorBoundary>
                <SessionGuard>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen
                      name="equipements-cuisine"
                      options={{ presentation: 'modal', headerShown: true, title: t('equipements.titre') }}
                    />
                    <Stack.Screen
                      name="economies"
                      options={{ headerShown: true, title: 'Économies' }}
                    />
                    <Stack.Screen
                      name="recette/[id]"
                      options={{ presentation: 'modal', headerShown: true, title: 'Recette' }}
                    />
                    <Stack.Screen
                      name="gouts"
                      options={{ presentation: 'modal', headerShown: true, title: 'Vos goûts' }}
                    />
                    <Stack.Screen
                      name="membres-foyer"
                      options={{ presentation: 'modal', headerShown: true, title: 'Membres du foyer' }}
                    />
                    <Stack.Screen
                      name="mon-foyer"
                      options={{ presentation: 'modal', headerShown: true, title: 'Mon foyer' }}
                    />
                    <Stack.Screen
                      name="adresses"
                      options={{ presentation: 'modal', headerShown: true, title: 'Adresses de livraison' }}
                    />
                    <Stack.Screen
                      name="aide"
                      options={{ presentation: 'modal', headerShown: true, title: 'Aide & support' }}
                    />
                  </Stack>
                  <WhatsNewModal
                    visible={Boolean(profil) && shouldShowWhatsNew}
                    release={currentRelease}
                    onClose={() => void markAsSeen()}
                  />
                </SessionGuard>
              </ErrorBoundary>
            </ThemeProvider>
          </PersistQueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
      <Toast />
    </View>
  );
}

export default Sentry.wrap(RootLayout);
