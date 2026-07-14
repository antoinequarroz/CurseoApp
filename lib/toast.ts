/** Systeme de toast unifie — style vert sauge coherent avec le design system. */
import Toast from 'react-native-toast-message';
import { formatPrix } from './format';

export const toast = {
  succes: (msg: string) =>
    Toast.show({ type: 'success', text1: msg, position: 'top', visibilityTime: 3000 }),
  erreur: (msg: string) =>
    Toast.show({ type: 'error', text1: msg, position: 'top', visibilityTime: 4000 }),
  info: (msg: string) =>
    Toast.show({ type: 'info', text1: msg, position: 'bottom', visibilityTime: 2500 }),
  economies: (montant: number) =>
    Toast.show({
      type: 'success',
      text1: 'Économies calculées',
      text2: `Tu économises ${formatPrix(montant)} sur cette commande`,
      position: 'bottom',
      visibilityTime: 4000,
    }),
};
