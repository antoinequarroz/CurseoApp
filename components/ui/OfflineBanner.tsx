/** Banniere discrete affichee sur l'ecran Courses quand la connexion est perdue. */
import React from 'react';
import { View } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useTheme } from '@/lib/theme-context';
import { Caption } from './Typography';

export function OfflineBanner() {
  const { estHorsLigne } = useNetworkStatus();
  const { colors } = useTheme();

  if (!estHorsLigne) return null;

  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.warning,
        paddingVertical: 8,
        paddingHorizontal: 16,
      }}
    >
      <WifiOff size={14} color="#1C1C1E" />
      <Caption style={{ color: '#1C1C1E' }}>
        Mode hors-ligne — vos modifications seront synchronisées
      </Caption>
    </View>
  );
}
