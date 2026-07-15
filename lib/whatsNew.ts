/** Nouveautes "What's New" — bottom-sheet affiche a l'ouverture quand une release non vue existe (brief point 37). */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

export interface Nouveaute {
  emoji: string;
  titre: string;
  description: string;
}

export interface Release {
  version: string;
  date: string;
  nouveautes: Nouveaute[];
}

// Ordre du plus recent au plus ancien — RELEASES[0] est toujours la derniere version.
export const RELEASES: Release[] = [
  {
    version: '1.0.0',
    date: '2026-07-15',
    nouveautes: [
      {
        emoji: '🍽️',
        titre: 'Swipe de recettes',
        description: "Decouvrez des recettes en un swipe et construisez votre planning de la semaine sans effort.",
      },
      {
        emoji: '🛒',
        titre: 'Liste de courses automatique',
        description: 'Votre planning genere une liste de courses classee par rayon, synchronisee meme hors ligne.',
      },
      {
        emoji: '💰',
        titre: 'Comparateur de prix',
        description: 'Comparez les prix entre enseignes et repérez les meilleures promotions avant de valider votre panier.',
      },
    ],
  },
];

const STORAGE_KEY = 'coursia_whats_new_last_seen_version';

function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function getCurrentVersion(): string {
  return Constants.expoConfig?.version ?? RELEASES[0]?.version ?? '0.0.0';
}

export function useWhatsNew() {
  const currentVersion = getCurrentVersion();
  const currentRelease = RELEASES.find((release) => release.version === currentVersion) ?? RELEASES[0] ?? null;

  const [lastSeenVersion, setLastSeenVersion] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function chargerVersionVue() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled) setLastSeenVersion(stored);
      } catch (error) {
        console.warn('[whatsNew] Lecture de la derniere version vue impossible.', error);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }
    void chargerVersionVue();
    return () => {
      cancelled = true;
    };
  }, []);

  const shouldShow =
    loaded &&
    currentRelease !== null &&
    (lastSeenVersion === null || compareVersions(currentVersion, lastSeenVersion) > 0);

  const markAsSeen = async () => {
    setLastSeenVersion(currentVersion);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, currentVersion);
    } catch (error) {
      console.warn('[whatsNew] Enregistrement de la version vue impossible.', error);
    }
  };

  return { shouldShow, currentRelease, markAsSeen, loaded };
}
