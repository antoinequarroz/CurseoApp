/** "On cerne vos goûts" — swipe de decouverte par categorie + sondage habitudes. */
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '@/lib/theme-context';
import { useProfilStore } from '@/stores/profilStore';
import { SwipeCategorieGouts } from '@/components/gouts/SwipeCategorieGouts';
import { SondageGouts } from '@/components/gouts/SondageGouts';
import { ScreenScroll } from '@/components/ui/Screen';
import { DisplayLG, BodySm, Subheading } from '@/components/ui/Typography';
import { t } from '@/lib/i18n';
import { CATEGORIES_GOUT, type CategorieGout } from '@/types';

type Onglet = 'decouverte' | 'sondage';

export default function Gouts() {
  const { colors } = useTheme();
  const profil = useProfilStore((s) => s.profil);
  const [onglet, setOnglet] = useState<Onglet>('decouverte');
  const [categorie, setCategorie] = useState<CategorieGout>('viande');

  return (
    <ScreenScroll contentContainerStyle={{ gap: 18 }} tabBar={false}>
      <View>
        <DisplayLG>{t('gouts.titre')}</DisplayLG>
        <BodySm>{t('gouts.sous_titre')}</BodySm>
      </View>

      <View style={{ flexDirection: 'row', backgroundColor: colors.bgSecondary, borderRadius: 18, padding: 5 }}>
        {(['decouverte', 'sondage'] as Onglet[]).map((o) => (
          <Pressable
            key={o}
            onPress={() => setOnglet(o)}
            accessibilityRole="tab"
            accessibilityState={{ selected: onglet === o }}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 14,
              backgroundColor: onglet === o ? colors.bgCard : 'transparent',
              alignItems: 'center',
            }}
          >
            <Subheading>{t(`gouts.onglet_${o}`)}</Subheading>
          </Pressable>
        ))}
      </View>

      {onglet === 'decouverte' && (
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORIES_GOUT.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCategorie(c)}
                accessibilityRole="button"
                accessibilityState={{ selected: categorie === c }}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 9999,
                  backgroundColor: categorie === c ? colors.primary : colors.bgSecondary,
                }}
              >
                <BodySm style={{ color: categorie === c ? '#FFFFFF' : colors.textPrimary }}>
                  {t(`gouts.categorie_${c}`)}
                </BodySm>
              </Pressable>
            ))}
          </View>
          <SwipeCategorieGouts categorie={categorie} profilId={profil?.id ?? 'demo-user'} />
        </View>
      )}

      {onglet === 'sondage' && <SondageGouts />}
    </ScreenScroll>
  );
}
