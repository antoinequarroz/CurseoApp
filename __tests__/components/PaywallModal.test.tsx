import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PaywallModal } from '@/components/ui/PaywallModal';
import { ThemeProvider } from '@/lib/theme-context';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('PaywallModal', () => {
  it("affiche les 4 paliers d'abonnement", async () => {
    const { getByText } = await renderWithTheme(
      <PaywallModal visible onClose={jest.fn()} onChoisir={jest.fn()} />,
    );
    expect(getByText('Gratuit')).toBeTruthy();
    expect(getByText('Standard')).toBeTruthy();
    expect(getByText('Premium')).toBeTruthy();
    expect(getByText('Famille')).toBeTruthy();
  });

  it('appelle onClose au tap sur le bouton fermer', async () => {
    const onClose = jest.fn();
    const { getByLabelText } = await renderWithTheme(
      <PaywallModal visible onClose={onClose} onChoisir={jest.fn()} />,
    );
    fireEvent.press(getByLabelText('Fermer'));
    expect(onClose).toHaveBeenCalled();
  });
});
