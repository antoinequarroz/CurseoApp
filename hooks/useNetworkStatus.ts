/** Détecte la perte de connexion réseau ou d'accès réel à Internet. */
import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [estConnecte, setEstConnecte] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // Un appareil peut être relié au Wi-Fi sans accès Internet. NetInfo
      // expose alors isConnected=true mais isInternetReachable=false : ce
      // cas doit piloter les mêmes états hors ligne qu'une coupure réseau.
      setEstConnecte(state.isConnected === true && state.isInternetReachable !== false);
    });
    return unsubscribe;
  }, []);

  return { estConnecte, estHorsLigne: !estConnecte };
}
