/** Retour discret sur la sauvegarde distante, sans bloquer les courses. */
import React from 'react';
import { Pressable, View } from 'react-native';
import { CloudUpload, RefreshCw, Smartphone } from 'lucide-react-native';
import { useTheme } from '@/lib/theme-context';
import { t } from '@/lib/i18n';
import { Caption } from '@/components/ui/Typography';

interface StatutSynchronisationProps {
  estConnecte: boolean;
  syncing: boolean;
  syncEnAttente: boolean;
  erreur: boolean;
  onReessayer: () => void;
}

export function StatutSynchronisation({
  estConnecte,
  syncing,
  syncEnAttente,
  erreur,
  onReessayer,
}: StatutSynchronisationProps) {
  const { colors } = useTheme();
  if (!syncing && !syncEnAttente && !erreur) return null;

  const resteSurAppareil = !estConnecte || erreur;
  const message = erreur
    ? t('courses.sync_erreur')
    : resteSurAppareil
      ? t('courses.sync_locale')
      : t('courses.sync_en_cours');
  const Icon = resteSurAppareil ? Smartphone : CloudUpload;

  return (
    <View
      style={{
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingLeft: 14,
        paddingRight: erreur ? 6 : 14,
        paddingVertical: 6,
        borderRadius: 18,
        borderCurve: 'continuous',
        backgroundColor: resteSurAppareil ? colors.warningBg : colors.bgSecondary,
      }}
    >
      <Icon size={17} color={resteSurAppareil ? colors.warning : colors.success} accessible={false} />
      <Caption accessibilityLiveRegion="polite" style={{ flex: 1, color: colors.textSecondary }}>
        {message}
      </Caption>
      {erreur && estConnecte ? (
        <Pressable
          onPress={onReessayer}
          accessibilityRole="button"
          accessibilityLabel={t('courses.sync_reessayer')}
          hitSlop={4}
          style={({ pressed }) => ({
            minHeight: 44,
            paddingHorizontal: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            opacity: pressed ? 0.65 : 1,
          })}
        >
          <RefreshCw size={15} color={colors.primary} accessible={false} />
          <Caption style={{ color: colors.primary }}>{t('courses.sync_reessayer')}</Caption>
        </Pressable>
      ) : null}
    </View>
  );
}
