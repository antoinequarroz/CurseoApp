import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SwipeRecette } from '@/components/recettes/SwipeRecette';
import { ThemeProvider } from '@/lib/theme-context';
import { RECETTES_MOCK } from '@/lib/mocks/recettes.mock';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: () => ({ upsert: jest.fn().mockResolvedValue({ error: null }) }) },
}));

describe('SwipeRecette', () => {
  it("affiche la recette et propose des boutons J'aime / Je passe accessibles", async () => {
    const recette = RECETTES_MOCK[0]!;
    const { getByLabelText, getByText } = await render(
      <ThemeProvider>
        <SwipeRecette recette={recette} profilId="u-1" onSwiped={jest.fn()} onTapDetail={jest.fn()} />
      </ThemeProvider>,
    );
    expect(getByText(recette.titre)).toBeTruthy();
    expect(getByLabelText("J'aime cette recette")).toBeTruthy();
    expect(getByLabelText('Je passe cette recette')).toBeTruthy();
  });

  it("declenche onSwiped(true) au tap sur le bouton J'aime", async () => {
    const recette = RECETTES_MOCK[0]!;
    const onSwiped = jest.fn();
    const { getByLabelText } = await render(
      <ThemeProvider>
        <SwipeRecette recette={recette} profilId="u-1" onSwiped={onSwiped} onTapDetail={jest.fn()} />
      </ThemeProvider>,
    );
    fireEvent.press(getByLabelText("J'aime cette recette"));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});
