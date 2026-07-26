import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/lib/theme-context';
import Aide from '@/app/aide';

const METRICS_TEST = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

async function renderAvecProviders() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS_TEST}>
      <ThemeProvider>
        <Aide />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('Aide', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('affiche la FAQ, le contact et la version', async () => {
    const { getByText } = await renderAvecProviders();
    expect(getByText('Questions fréquentes')).toBeTruthy();
    expect(getByText('Nous contacter')).toBeTruthy();
    expect(getByText('support@coursia.app')).toBeTruthy();
    expect(getByText('Version de l\'application')).toBeTruthy();
  });

  it('FAQ : une question repliee ne montre pas sa reponse tant qu\'on ne l\'ouvre pas', async () => {
    const { queryByText, getByText, getByLabelText } = await renderAvecProviders();
    expect(queryByText(/génère automatiquement ta liste de courses/)).toBeNull();

    fireEvent.press(getByLabelText('Comment fonctionne la liste de courses ?'));
    await waitFor(() => expect(getByText(/génère automatiquement ta liste de courses/)).toBeTruthy());
  });

  it('contact : ouvre un lien mailto vers le support', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

    const { getByLabelText } = await renderAvecProviders();
    fireEvent.press(getByLabelText('Nous contacter'));

    await waitFor(() => expect(openURL).toHaveBeenCalledWith(expect.stringContaining('mailto:support@coursia.app')));
  });
});
