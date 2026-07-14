/** Regle absolue : zero pixel hardcode dans les composants — tout passe par ce hook. */
import { Platform, useWindowDimensions } from 'react-native';

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    isSmall: width < 380,
    isMedium: width >= 380 && width < 414,
    isLarge: width >= 414,
    colonnesRecettes: width < 380 ? 1 : 2,
    paddingHorizontal: width < 380 ? 16 : 20,
    cardHeight: width < 380 ? 280 : 320,
    isIOS: Platform.OS === 'ios',
    isAndroid: Platform.OS === 'android',
  };
}
