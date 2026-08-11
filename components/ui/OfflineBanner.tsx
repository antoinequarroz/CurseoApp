/** Banniere discrete affichee quand la connexion est perdue. */
import React from 'react';
import { View } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useTheme } from '@/lib/theme-context';
import { t } from '@/lib/i18n';
import { Caption } from './Typography';

interface OfflineBannerViewProps {
  visible: boolean;
  message?: string;
}

export function OfflineBannerView({ visible, message }: OfflineBannerViewProps) {
  const { colors } = useTheme();

  if (!visible) return null;

  return (
    <View
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={message ?? t('commun.hors_ligne_message')}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.warning,
        paddingVertical: 8,
        paddingHorizontal: 16,
      }}
    >
      <WifiOff size={14} color="#1C1C1E" accessible={false} />
      <Caption style={{ color: '#1C1C1E' }}>
        {message ?? t('commun.hors_ligne_message')}
      </Caption>
    </View>
  );
}

/** Variante autonome pour les ecrans qui ne suivent pas deja la connexion. */
export function OfflineBanner({ message }: { message?: string } = {}) {
  const { estHorsLigne } = useNetworkStatus();
  return <OfflineBannerView visible={estHorsLigne} message={message} />;
}
