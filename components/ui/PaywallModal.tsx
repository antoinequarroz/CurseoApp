/** Paywall elegant — s'ouvre uniquement au tap sur une feature premium, dismissal facile. */
import React from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { useTheme } from '@/lib/theme-context';
import { useHaptics } from '@/hooks/useHaptics';
import { t } from '@/lib/i18n';
import { PALIERS_ABONNEMENT } from '@/lib/revenuecat';
import { analytics } from '@/lib/analytics';
import { Body, BodySm, Heading, DisplayLG } from './Typography';
import { Button } from './Button';
import type { NiveauAbonnement } from '@/types';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onChoisir: (palier: NiveauAbonnement) => void;
  featureOrigine?: string;
}

export function PaywallModal({ visible, onClose, onChoisir, featureOrigine }: PaywallModalProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  React.useEffect(() => {
    if (visible) {
      void haptics.medium();
      analytics.paywallShown(featureOrigine ?? 'inconnue');
    }
  }, [visible, featureOrigine, haptics]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <View style={{ backgroundColor: colors.bgElevated, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 }}>
            <DisplayLG>{t('paywall.titre')}</DisplayLG>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('commun.fermer')}
              hitSlop={8}
            >
              <X size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
            {PALIERS_ABONNEMENT.map((palier) => (
              <Pressable
                key={palier.id}
                onPress={() => onChoisir(palier.id)}
                accessibilityRole="button"
                accessibilityLabel={t('paywall.choisir_palier_label', { nom: palier.nom, prix: palier.prix })}
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 16,
                  gap: 8,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Heading>{palier.nom}</Heading>
                  <Body style={{ color: colors.primary, fontWeight: '600' }}>{palier.prix}</Body>
                </View>
                {palier.fonctionnalites.map((f) => (
                  <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Check size={14} color={colors.success} />
                    <BodySm>{f}</BodySm>
                  </View>
                ))}
              </Pressable>
            ))}
          </ScrollView>

          <View style={{ padding: 20 }}>
            <Button label={t('paywall.continuer')} onPress={() => onChoisir('standard')} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
