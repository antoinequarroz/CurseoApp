/**
 * Ajout d'un article libre a la liste de courses — pour tout ce qui ne sort
 * pas d'une recette (fruits du dejeuner, yogourts, papier toilette...).
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useTheme } from '@/lib/theme-context';
import { useHaptics } from '@/hooks/useHaptics';
import { Caption } from '@/components/ui/Typography';
import { ORDRE_RAYONS, type Rayon } from '@/types';
import { t } from '@/lib/i18n';

const LABEL_RAYON: Record<Rayon, string> = {
  'Fruits & Legumes': t('courses.rayon_fruits_legumes'),
  Viandes: t('courses.rayon_viandes'),
  'Produits laitiers': t('courses.rayon_produits_laitiers'),
  Epicerie: t('courses.rayon_epicerie'),
  Conserves: t('courses.rayon_conserves'),
  Surgeles: t('courses.rayon_surgeles'),
  Boissons: t('courses.rayon_boissons'),
  Hygiene: t('courses.rayon_hygiene'),
};

export function AjouterArticle({ onAjouter }: { onAjouter: (produit: string, rayon: Rayon) => void }) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const [nom, setNom] = useState('');
  const [rayon, setRayon] = useState<Rayon>('Epicerie');

  const soumettre = () => {
    const nomNettoye = nom.trim();
    if (!nomNettoye) return;
    void haptics.success();
    onAjouter(nomNettoye, rayon);
    setNom('');
  };

  return (
    <View style={{ gap: 10, padding: 14, borderRadius: 18, backgroundColor: colors.bgSecondary }}>
      <Caption>{t('courses.ajouter_article_titre')}</Caption>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {ORDRE_RAYONS.map((r) => (
          <Pressable
            key={r}
            onPress={() => setRayon(r)}
            accessibilityRole="button"
            accessibilityState={{ selected: rayon === r }}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 9999,
              backgroundColor: rayon === r ? colors.primary : colors.bgCard,
              marginRight: 6,
            }}
          >
            <Caption style={{ color: rayon === r ? '#FFFFFF' : colors.textPrimary }}>{LABEL_RAYON[r]}</Caption>
          </Pressable>
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TextInput
          value={nom}
          onChangeText={setNom}
          onSubmitEditing={soumettre}
          returnKeyType="done"
          placeholder={t('courses.ajouter_article_placeholder')}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={t('courses.ajouter_article_placeholder')}
          style={{
            flex: 1,
            backgroundColor: colors.bgCard,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: colors.textPrimary,
          }}
        />
        <Pressable
          onPress={soumettre}
          disabled={!nom.trim()}
          accessibilityRole="button"
          accessibilityLabel={t('courses.ajouter_article_bouton')}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: nom.trim() ? colors.primary : colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Plus size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}
