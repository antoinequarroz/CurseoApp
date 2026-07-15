import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWhatsNew, RELEASES, getCurrentVersion } from '@/lib/whatsNew';

describe('useWhatsNew', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('propose la derniere release comme currentRelease', async () => {
    const { result } = await renderHook(() => useWhatsNew());
    expect(result.current.currentRelease?.version).toBe(getCurrentVersion());
    expect(RELEASES[0]?.nouveautes.length).toBeGreaterThanOrEqual(2);
  });

  it('affiche les nouveautes si aucune version n\'a ete vue', async () => {
    const { result } = await renderHook(() => useWhatsNew());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.shouldShow).toBe(true);
  });

  it('ne raffiche plus les nouveautes une fois marquees comme vues', async () => {
    const { result } = await renderHook(() => useWhatsNew());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await result.current.markAsSeen();
    });

    expect(result.current.shouldShow).toBe(false);
    expect(await AsyncStorage.getItem('coursia_whats_new_last_seen_version')).toBe(getCurrentVersion());
  });

  it('reaffiche les nouveautes si la version vue est plus ancienne que la version courante', async () => {
    await AsyncStorage.setItem('coursia_whats_new_last_seen_version', '0.9.0');
    const { result } = await renderHook(() => useWhatsNew());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.shouldShow).toBe(true);
  });
});
