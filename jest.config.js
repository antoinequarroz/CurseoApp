module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|lucide-react-native)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@react-native-async-storage/async-storage$':
      '<rootDir>/node_modules/@react-native-async-storage/async-storage/jest/async-storage-mock',
    '^lucide-react-native$': '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
  setupFiles: ['./jest.setup.js'],
  // Exclut les wrappers fins autour de modules natifs / services externes
  // (SDK init, storage, notifications...) : leur valeur est dans l'integration
  // reelle, pas dans un test unitaire qui mockerait tout le corps de la fonction.
  collectCoverageFrom: [
    'stores/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    '!lib/supabase.ts',
    '!lib/secureStorage.ts',
    '!lib/queryClient.ts',
    '!lib/notifications.ts',
    '!lib/toast.ts',
    '!lib/analytics.ts',
    '!lib/revenuecat.ts',
    '!lib/uploadImage.ts',
    '!lib/i18n.ts',
    '!lib/icons.ts',
    '!lib/dates.ts',
  ],
  coverageThreshold: {
    global: { lines: 60 },
  },
};
