import { act, renderHook } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

jest.mock('@react-native-community/netinfo', () =>
  jest.requireActual('@react-native-community/netinfo/jest/netinfo-mock'),
);

const mockAddEventListener = NetInfo.addEventListener as jest.Mock;

describe('useNetworkStatus', () => {
  let listener: (state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => void;
  const unsubscribe = jest.fn();

  beforeEach(() => {
    unsubscribe.mockClear();
    mockAddEventListener.mockReset();
    mockAddEventListener.mockImplementation((callback) => {
      listener = callback;
      return unsubscribe;
    });
  });

  it('considere hors ligne une connexion Wi-Fi sans acces Internet', async () => {
    const { result } = await renderHook(() => useNetworkStatus());

    await act(async () => listener({ isConnected: true, isInternetReachable: false }));

    expect(result.current).toEqual({ estConnecte: false, estHorsLigne: true });
  });

  it('reste en ligne pendant que la joignabilite est encore inconnue', async () => {
    const { result } = await renderHook(() => useNetworkStatus());

    await act(async () => listener({ isConnected: true, isInternetReachable: null }));

    expect(result.current).toEqual({ estConnecte: true, estHorsLigne: false });
  });

  it('desabonne NetInfo au demontage', async () => {
    const { unmount } = await renderHook(() => useNetworkStatus());
    await act(async () => unmount());
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
