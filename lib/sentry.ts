/**
 * Observabilite minimale pour la V1 Store.
 *
 * Aucun identifiant utilisateur, contenu alimentaire, token ou donnee de
 * formulaire n'est transmis. Les traces de performance, captures d'ecran et
 * replays restent desactives tant qu'un besoin produit et une base legale
 * explicites ne les justifient pas.
 */
import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';
import type { Breadcrumb, ErrorEvent } from '@sentry/react-native';

const extra = Constants.expoConfig?.extra ?? {};
const dsn = (extra.sentryDsn as string | undefined) ?? '';
const environnement = (extra.appEnv as string | undefined) ?? 'development';

export function nettoyerEvenementSentry(event: ErrorEvent): ErrorEvent {
  event.user = undefined;

  if (event.request) {
    event.request.headers = undefined;
    event.request.cookies = undefined;
    event.request.data = undefined;
    event.request.query_string = undefined;
  }

  return event;
}

export function nettoyerBreadcrumbSentry(breadcrumb: Breadcrumb): Breadcrumb {
  return {
    ...breadcrumb,
    // Les donnees de navigation/reseau peuvent contenir une URL, un email,
    // une recherche ou une contrainte alimentaire. La categorie et le
    // message suffisent pour diagnostiquer le prototype.
    data: undefined,
  };
}

export const sentryActif = Boolean(dsn) && !__DEV__ && environnement !== 'development';

Sentry.init({
  dsn,
  enabled: sentryActif,
  environment: environnement,
  sendDefaultPii: false,
  tracesSampleRate: 0,
  beforeSend: nettoyerEvenementSentry,
  beforeBreadcrumb: nettoyerBreadcrumbSentry,
});

export { Sentry };
