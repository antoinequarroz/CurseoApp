/** Wrappe toute l'app. En prod, log silencieux sur Sentry ; en dev, stack trace visible. */
import React from 'react';
import { View } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { Heading, BodySm } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { t } from '@/lib/i18n';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error): void {
    if (!__DEV__) Sentry.captureException(error);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
          <Heading>{t('erreurs.boundary_titre')}</Heading>
          {__DEV__ ? (
            <BodySm style={{ textAlign: 'center' }}>{this.state.error.message}</BodySm>
          ) : (
            <BodySm style={{ textAlign: 'center' }}>
              {t('erreurs.boundary_message')}
            </BodySm>
          )}
          <Button label={t('commun.reessayer')} onPress={() => this.setState({ error: null })} />
        </View>
      );
    }
    return this.props.children;
  }
}
