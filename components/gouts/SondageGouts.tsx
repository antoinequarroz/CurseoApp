/**
 * Sondage "vos habitudes" — frequence viande/poisson + produits favoris
 * (marques preferees) pour affiner les recettes/produits suggeres.
 */
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '@/lib/theme-context';
import { useHaptics } from '@/hooks/useHaptics';
import { useGoutsStore } from '@/stores/goutsStore';
import { BodySm, Caption, Subheading } from '@/components/ui/Typography';
import { t } from '@/lib/i18n';
import { FREQUENCES_REPAS, type FrequenceRepas } from '@/types';

function SelecteurFrequence({
  titre,
  valeur,
  onChange,
}: {
  titre: string;
  valeur: FrequenceRepas | null;
  onChange: (f: FrequenceRepas) => void;
}) {
  const { colors } = useTheme();
  const haptics = useHaptics();

  return (
    <View style={{ gap: 8 }}>
      <BodySm style={{ fontWeight: '600' }}>{titre}</BodySm>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {FREQUENCES_REPAS.map((f) => (
          <Pressable
            key={f}
            onPress={() => {
              void haptics.selection();
              onChange(f);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: valeur === f }}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 9999,
              backgroundColor: valeur === f ? colors.primary : colors.bgSecondary,
            }}
          >
            <Caption style={{ color: valeur === f ? '#FFFFFF' : colors.textPrimary }}>
              {t(`gouts.frequence_${f}`)}
            </Caption>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function SondageGouts() {
  const { colors } = useTheme();
  const { sondage, definirFrequenceViande, definirFrequencePoisson, ajouterProduitFavori, retirerProduitFavori } =
    useGoutsStore();
  const [produit, setProduit] = useState('');

  const ajouter = () => {
    const nomNettoye = produit.trim();
    if (!nomNettoye) return;
    ajouterProduitFavori(nomNettoye);
    setProduit('');
  };

  return (
    <View style={{ gap: 20 }}>
      <SelecteurFrequence
        titre={t('gouts.frequence_viande_titre')}
        valeur={sondage.frequence_viande}
        onChange={definirFrequenceViande}
      />
      <SelecteurFrequence
        titre={t('gouts.frequence_poisson_titre')}
        valeur={sondage.frequence_poisson}
        onChange={definirFrequencePoisson}
      />

      <View style={{ gap: 8 }}>
        <Subheading>{t('gouts.produits_favoris_titre')}</Subheading>
        <Caption>{t('gouts.produits_favoris_hint')}</Caption>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput
            value={produit}
            onChangeText={setProduit}
            onSubmitEditing={ajouter}
            returnKeyType="done"
            placeholder={t('gouts.produits_favoris_placeholder')}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={t('gouts.produits_favoris_placeholder')}
            style={{
              flex: 1,
              backgroundColor: colors.bgSecondary,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: colors.textPrimary,
            }}
          />
          <Pressable
            onPress={ajouter}
            disabled={!produit.trim()}
            accessibilityRole="button"
            accessibilityLabel={t('gouts.produits_favoris_ajouter')}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: produit.trim() ? colors.primary : colors.border,
            }}
          >
            <Caption style={{ color: '#FFFFFF' }}>{t('gouts.produits_favoris_ajouter')}</Caption>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {sondage.produits_favoris.map((p) => (
            <View
              key={p}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 9999,
                backgroundColor: colors.bgSecondary,
              }}
            >
              <Caption>{p}</Caption>
              <Pressable
                onPress={() => retirerProduitFavori(p)}
                accessibilityRole="button"
                accessibilityLabel={t('gouts.produits_favoris_retirer', { produit: p })}
                hitSlop={8}
              >
                <X size={13} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
