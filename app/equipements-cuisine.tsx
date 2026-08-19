import React from 'react';
import { View } from 'react-native';
import { SelecteurEquipements } from '@/components/profil/SelecteurEquipements';
import { ScreenScroll } from '@/components/ui/Screen';
import { Body, Caption, DisplayLG } from '@/components/ui/Typography';
import { useProfilStore } from '@/stores/profilStore';
import { t } from '@/lib/i18n';

export default function EquipementsCuisineScreen() {
  const profil = useProfilStore((state) => state.profil);
  const mettreAJourPreferences = useProfilStore((state) => state.mettreAJourPreferences);

  return (
    <ScreenScroll tabBar={false} contentContainerStyle={{ gap: 18 }}>
      <View style={{ gap: 6 }}>
        <DisplayLG>{t('equipements.titre')}</DisplayLG>
        <Body>{t('equipements.description')}</Body>
      </View>
      {profil ? (
        <>
          <SelecteurEquipements
            valeur={profil.equipements_cuisine}
            onChange={(equipements_cuisine) => mettreAJourPreferences({ equipements_cuisine })}
          />
          <Caption accessibilityLiveRegion="polite">{t('equipements.enregistrement_auto')}</Caption>
        </>
      ) : (
        <Body>{t('equipements.non_connecte')}</Body>
      )}
    </ScreenScroll>
  );
}
