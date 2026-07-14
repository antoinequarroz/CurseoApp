import type { ExpoConfig } from 'expo/config';

// APP_ENV distingue dev / staging / prod pour ne jamais melanger les bases
// de donnees ou les cles d'abonnement entre environnements (voir .env.example).
const APP_ENV = process.env.APP_ENV ?? 'development';
const IS_DEV = APP_ENV === 'development';
const IS_PROD = APP_ENV === 'production';

const config: ExpoConfig = {
  owner: 'antoinequarr',
  name: IS_DEV ? 'Courseo (Dev)' : IS_PROD ? 'Courseo' : 'Courseo (Staging)',
  slug: 'courseo',
  version: '1.0.0',
  orientation: 'portrait', // Une app de courses ne beneficie pas du paysage
  icon: './assets/icon.png',
  scheme: 'courseo', // courseo://recette/123
  userInterfaceStyle: 'automatic', // Supporte light + dark automatiquement
  ios: {
    bundleIdentifier: IS_PROD ? 'ch.courseo.app' : `ch.courseo.app.${APP_ENV}`,
    buildNumber: '3',
    supportsTablet: false, // MVP telephone uniquement
    requireFullScreen: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSUserNotificationsUsageDescription:
        'Courseo vous envoie des rappels de planification et des alertes de promotions.',
      CFBundleLocalizations: ['fr', 'de', 'it'],
    },
  },
  android: {
    package: IS_PROD ? 'ch.courseo.app' : `ch.courseo.app.${APP_ENV}`,
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
      backgroundColor: '#2D6A4F',
    },
    permissions: ['RECEIVE_BOOT_COMPLETED', 'VIBRATE'],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        // TODO design : remplacer par un vrai visuel splash Courseo (branche design system)
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#2D6A4F',
      },
    ],
    'expo-status-bar',
    'expo-font',
    'expo-secure-store',
    'expo-localization',
    'expo-apple-authentication',
    [
      'expo-image',
      {},
    ],
    [
      'expo-notifications',
      {
        // TODO design : icone de notification monochrome dediee (actuellement l'icone app)
        icon: './assets/icon.png',
        color: '#2D6A4F',
      },
    ],
    '@sentry/react-native',
  ],
  extra: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    revenuecatKeyIos: process.env.REVENUECAT_API_KEY_IOS,
    revenuecatKeyAndroid: process.env.REVENUECAT_API_KEY_ANDROID,
    sentryDsn: process.env.SENTRY_DSN,
    posthogApiKey: process.env.POSTHOG_API_KEY,
    appEnv: APP_ENV,
    router: {},
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? '85498c7a-95c6-440d-84a7-7d72e038d5c2',
    },
  },
};

export default config;
