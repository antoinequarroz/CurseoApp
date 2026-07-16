/**
 * Apercu (desactive) de la personnalisation des regimes/allergies par membre
 * du foyer — reserve au palier Famille. Affiche en grise avec un cadenas pour
 * donner envie sans permettre la saisie tant que l'abonnement n'est pas actif.
 * Utilise a la fois dans l'onboarding et dans Profil.
 */
import React from 'react';
import { View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { useTheme } from '@/lib/theme-context';
import { Body, BodySm, Caption } from './Typography';
import { t } from '@/lib/i18n';

export function RegimeParPersonneTeaser() {
  const { colors } = useTheme();

  return (
    <View
      style={{
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        borderStyle: 'dashed',
        padding: 14,
        gap: 8,
        opacity: 0.6,
      }}
      accessibilityRole="text"
      accessibilityLabel={t('onboarding.regime_par_personne_a11y')}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Lock size={14} color={colors.textMuted} />
        <Body>{t('onboarding.regime_par_personne_titre')}</Body>
        <View style={{ backgroundColor: colors.accent, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
          <Caption style={{ color: colors.primaryDark, fontWeight: '700' }}>{t('onboarding.palier_famille')}</Caption>
        </View>
      </View>
      <BodySm>{t('onboarding.regime_par_personne_description')}</BodySm>
    </View>
  );
}
