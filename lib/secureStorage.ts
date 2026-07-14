/**
 * Adapter de stockage securise pour les tokens d'authentification.
 * NE JAMAIS utiliser AsyncStorage pour les tokens — expo-secure-store les
 * chiffre via Keychain (iOS) / Keystore (Android).
 */
import * as SecureStore from 'expo-secure-store';

export const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};
