import { lightTheme, darkTheme } from '@/lib/theme';

describe('theme tokens', () => {
  it('expose les memes cles entre light et dark', () => {
    expect(Object.keys(lightTheme).sort()).toEqual(Object.keys(darkTheme).sort());
  });
});
