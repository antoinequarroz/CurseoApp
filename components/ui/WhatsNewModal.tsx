/** Bottom-sheet "Nouveautes" — affiche la derniere release au demarrage si non vue (brief point 37). */
import React from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '@/lib/theme-context';
import { useHaptics } from '@/hooks/useHaptics';
import type { Release } from '@/lib/whatsNew';
import { Body, BodySm, Caption, DisplayLG, Heading } from './Typography';
import { Button } from './Button';

interface WhatsNewModalProps {
  visible: boolean;
  release: Release | null;
  onClose: () => void;
}

export function WhatsNewModal({ visible, release, onClose }: WhatsNewModalProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  React.useEffect(() => {
    if (visible) void haptics.medium();
  }, [visible, haptics]);

  if (!release) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <View style={{ backgroundColor: colors.bgElevated, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 }}>
            <View style={{ gap: 4 }}>
              <DisplayLG>Quoi de neuf ?</DisplayLG>
              <Caption>Version {release.version}</Caption>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
              hitSlop={8}
            >
              <X size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            {release.nouveautes.map((nouveaute) => (
              <View
                key={nouveaute.titre}
                style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}
              >
                <Body style={{ fontSize: 24 }}>{nouveaute.emoji}</Body>
                <View style={{ flex: 1, gap: 2 }}>
                  <Heading>{nouveaute.titre}</Heading>
                  <BodySm>{nouveaute.description}</BodySm>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={{ padding: 20 }}>
            <Button label="Super, on continue !" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
