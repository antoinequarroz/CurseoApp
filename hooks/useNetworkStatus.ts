/** Detecte la perte de connexion — pilote <OfflineBanner /> sur l'ecran Courses. */
import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [estConnecte, setEstConnecte] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setEstConnecte(Boolean(state.isConnected));
    });
    return unsubscribe;
  }, []);

  return { estConnecte, estHorsLigne: !estConnecte };
}
