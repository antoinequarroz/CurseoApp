/**
 * Adaptateur web pour Supabase. Expo SecureStore cible les plateformes
 * natives ; le navigateur utilise son stockage local pour l'aperçu web.
 */
export const secureStorage = {
  getItem: async (key: string) => globalThis.localStorage?.getItem(key) ?? null,
  setItem: async (key: string, value: string) => globalThis.localStorage?.setItem(key, value),
  removeItem: async (key: string) => globalThis.localStorage?.removeItem(key),
};
