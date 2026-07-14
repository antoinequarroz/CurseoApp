/**
 * Layout racine. Garde le splash visible jusqu'a ce que fonts + session +
 * theme soient charges — evite tout flash au demarrage (voir brief point 15).
 */
import 'react-native-url-polyfill/auto';
import '../global.css';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import {
  useFonts as useDMSansFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';
import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import { ThemeProvider } from '@/lib/theme-context';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { useProfilStore } from '@/stores/profilStore';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SessionGuard } from '@/components/SessionGuard';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [fontsLoaded] = useDMSansFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    DMMono_400Regular,
    DMMono_500Medium,
  });

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
        }
      } catch (error) {
        console.warn('[startup] Initialisation session/profil ignoree.', error);
      }
      setAppReady(true);
    }
    void prepare();
  }, [fontsLoaded]);

  const onLayoutRootView = useCallback(async () => {
    if (appReady) await SplashScreen.hideAsync();
  }, [appReady]);

  if (!appReady) return null;

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <ErrorBoundary>
                <SessionGuard>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="recette/[id]" options={{ presentation: 'modal', headerShown: true, title: 'Recette' }} />
                  </Stack>
                </SessionGuard>
              </ErrorBoundary>
            </ThemeProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
      <Toast />
    </View>
  );
}
