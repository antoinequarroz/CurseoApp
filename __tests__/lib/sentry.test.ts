import { nettoyerBreadcrumbSentry, nettoyerEvenementSentry } from '@/lib/sentry';
import type { ErrorEvent } from '@sentry/react-native';

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
}));

describe('confidentialite Sentry', () => {
  it('retire identite, headers, cookies, requete et formulaire', () => {
    const event = nettoyerEvenementSentry(
      {
        user: { id: 'uuid-prive', email: 'alex@example.com' },
        request: {
          url: 'https://example.com/prix',
          headers: { Authorization: 'Bearer secret' },
          cookies: { session: 'secret' },
          data: { allergies: ['arachides'] },
          query_string: 'email=alex@example.com',
        },
      } as unknown as ErrorEvent,
    );

    expect(event.user).toBeUndefined();
    expect(event.request?.headers).toBeUndefined();
    expect(event.request?.cookies).toBeUndefined();
    expect(event.request?.data).toBeUndefined();
    expect(event.request?.query_string).toBeUndefined();
  });

  it('conserve le contexte utile sans les donnees detaillees du breadcrumb', () => {
    expect(
      nettoyerBreadcrumbSentry({
        category: 'navigation',
        message: 'Ouverture ecran',
        data: { route: '/profil?email=alex@example.com' },
      }),
    ).toEqual({ category: 'navigation', message: 'Ouverture ecran', data: undefined });
  });
});
