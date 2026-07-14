/** i18n — français uniquement pour le MVP (Suisse romande = Phase 1). Ne jamais hardcoder une chaîne visible. */
import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import fr from '@/locales/fr.json';
import de from '@/locales/de.json';
import it from '@/locales/it.json';

const i18n = new I18n({ fr, de, it });
i18n.locale = Localization.getLocales()[0]?.languageCode ?? 'fr';
i18n.defaultLocale = 'fr';
i18n.enableFallback = true;

export function t(key: string, options?: Record<string, string | number>): string {
  return i18n.t(key, options);
}
