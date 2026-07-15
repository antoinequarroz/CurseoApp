/** Modal de signalement d'une recette communautaire — motifs + commentaire optionnel (voir §41 moderation). */
import React, { useState } from 'react';
import { Modal, Pressable, TextInput, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '@/lib/theme-context';
import { useHaptics } from '@/hooks/useHaptics';
import { t } from '@/lib/i18n';
import { useSignalerRecette, type MotifSignalement } from '@/hooks/useSignalerRecette';
import { Body, BodySm, DisplayLG } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';

interface SignalerRecetteModalProps {
  visible: boolean;
  onClose: () => void;
  recetteId: string;
}

const MOTIFS: { id: MotifSignalement; label: string }[] = [
  { id: 'contenu_inapproprie', label: t('signalement.motif_contenu_inapproprie') },
  { id: 'information_incorrecte', label: t('signalement.motif_information_incorrecte') },
  { id: 'spam_publicite', label: t('signalement.motif_spam_publicite') },
  { id: 'plagiat', label: t('signalement.motif_plagiat') },
  { id: 'autre', label: t('signalement.motif_autre') },
];

export function SignalerRecetteModal({ visible, onClose, recetteId }: SignalerRecetteModalProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const { mutate, isPending } = useSignalerRecette();
  const [motif, setMotif] = useState<MotifSignalement | null>(null);
  const [detail, setDetail] = useState('');

  const reinitialiser = () => {
    setMotif(null);
    setDetail('');
  };

  const fermer = () => {
    reinitialiser();
    onClose();
  };

  const confirmer = () => {
    if (!motif) return;
    void haptics.medium();
    mutate(
      { recetteId, raison: motif, detail },
      { onSuccess: fermer, onError: fermer },
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={fermer}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <View style={{ backgroundColor: colors.bgElevated, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 }}>
            <DisplayLG>{t('signalement.titre')}</DisplayLG>
            <Pressable
              onPress={fermer}
              accessibilityRole="button"
              accessibilityLabel={t('commun.fermer')}
              hitSlop={8}
            >
              <X size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: 20, gap: 12 }}>
            <BodySm>{t('signalement.question')}</BodySm>

            {MOTIFS.map((m) => {
              const selectionne = motif === m.id;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => {
                    void haptics.selection();
                    setMotif(m.id);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selectionne }}
                  accessibilityLabel={m.label}
                  style={{
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: selectionne ? colors.primary : colors.border,
                    backgroundColor: selectionne ? colors.bgSecondary : 'transparent',
                    padding: 14,
                  }}
                >
                  <Body style={{ color: selectionne ? colors.primary : colors.textPrimary }}>{m.label}</Body>
                </Pressable>
              );
            })}

            <TextInput
              value={detail}
              onChangeText={setDetail}
              placeholder={t('signalement.detail_placeholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              accessibilityLabel={t('signalement.detail_label')}
              style={{
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 14,
                minHeight: 80,
                textAlignVertical: 'top',
                color: colors.textPrimary,
              }}
            />
          </View>

          <View style={{ padding: 20 }}>
            <Button
              label={t('signalement.envoyer')}
              onPress={confirmer}
              disabled={!motif}
              loading={isPending}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
