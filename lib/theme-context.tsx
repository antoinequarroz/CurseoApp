import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Animated, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTheme, lightTheme, type Theme } from './theme';

export type ApparencePreference = 'auto' | 'clair' | 'sombre';

const STORAGE_KEY = 'courseo_apparence';

interface ThemeContextValue {
  isDark: boolean;
  colors: Theme;
  preference: ApparencePreference;
  setPreference: (pref: ApparencePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Fournit le theme courant a toute l'app. La preference (auto/clair/sombre)
 * est chargee depuis AsyncStorage avant meme le profil Supabase, pour eviter
 * un flash de theme incorrect au demarrage (voir app/_layout.tsx).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ApparencePreference>('auto');
  const fade = useMemo(() => new Animated.Value(1), []);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'auto' || stored === 'clair' || stored === 'sombre') {
        setPreferenceState(stored);
      }
    });
  }, []);

  const isDark = preference === 'auto' ? systemScheme === 'dark' : preference === 'sombre';

  const setPreference = useCallback(
    (pref: ApparencePreference) => {
      // Transition douce de 200ms pour eviter le flash brutal entre themes.
      Animated.sequence([
        Animated.timing(fade, { toValue: 0, duration: 100, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
      setPreferenceState(pref);
      void AsyncStorage.setItem(STORAGE_KEY, pref);
    },
    [fade],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      isDark,
      colors: isDark ? darkTheme : lightTheme,
      preference,
      setPreference,
    }),
    [isDark, preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme doit etre utilise a l\'interieur de ThemeProvider');
  return ctx;
}
