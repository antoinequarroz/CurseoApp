import type { ExpoConfig } from 'expo/config';

// APP_ENV distingue dev / staging / prod pour ne jamais melanger les bases
// de donnees ou les cles d'abonnement entre environnements (voir .env.example).
const APP_ENV = process.env.APP_ENV ?? 'development';

const config: ExpoConfig = {
  owner: 'antoinequarr',
  // Nom fixe (pas de suffixe Dev/Staging) : EAS Build derive le nom de la
  // cible Xcode generee par `expo prebuild` de ce champ. Le faire varier
  // avec APP_ENV a deja provoque des builds casses ("Could not find target
  // 'CourseoStaging'/'Courseo' in project.pbxproj") quand la resolution de
  // APP_ENV divergeait entre l'etape de credentials et celle de prebuild sur
  // les serveurs EAS. bundleIdentifier reste dynamique, ce qui suffit a
  // distinguer les environnements sur l'appareil.
  // Rebranding "Coursia" : le nom affiche change, mais slug/scheme/bundleId
  // restent sur "courseo" pour ne pas casser le projet EAS et les
  // credentials App Store Connect deja enregistres.
  name: 'Coursia',
  slug: 'courseo',
  version: '1.0.0',
  orientation: 'portrait', // Une app de courses ne beneficie pas du paysage
  icon: './assets/icon.png',
  scheme: 'courseo', // courseo://recette/123
  userInterfaceStyle: 'automatic', // Supporte light + dark automatiquement
  ios: {
    // Fixe pour la meme raison que `name` ci-dessus : le binaire compile embarque
    // cet identifiant au moment du prebuild, et sur les serveurs EAS la valeur
    // de APP_ENV a divergé entre l'etape de credentials (correcte) et celle de
    // prebuild (retombee sur le fallback 'development'), causant un mismatch
    // avec le profil de provisioning App Store lors de la signature.
    bundleIdentifier: 'ch.courseo.app',
    buildNumber: '9',
    supportsTablet: false, // MVP telephone uniquement
    requireFullScreen: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSUserNotificationsUsageDescription:
        'Coursia vous envoie des rappels de planification et des alertes de promotions.',
      CFBundleLocalizations: ['fr', 'de', 'it'],
    },
  },
  android: {
    package: 'ch.courseo.app',
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
      backgroundColor: '#3E6B52',
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
        // TODO design : remplacer par un vrai visuel splash Coursia (branche design system)
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#3E6B52',
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
        color: '#3E6B52',
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
