/** COUR-28 : ecran dedie "Mon foyer" — consolide prenom/composition/budget/regime/allergies/enseignes (COUR-24's "infos foyer" + "preferences foyer" inline auparavant). */
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useTheme } from '@/lib/theme-context';
import { useProfilStore } from '@/stores/profilStore';
import { Card } from '@/components/ui/Card';
import { ScreenScroll } from '@/components/ui/Screen';
import { DisplayLG, Heading, Body, BodySm, Caption } from '@/components/ui/Typography';
import { t } from '@/lib/i18n';
import type { Enseigne, Regime } from '@/types';

const REGIME_OPTIONS: Regime[] = ['vegetarien', 'vegan', 'halal', 'sans_gluten', 'sans_lactose', 'sans_noix', 'poisson'];
const ENSEIGNE_OPTIONS: Enseigne[] = ['coop', 'migros', 'lidl', 'aldi', 'ottos', 'manor_food'];

const LABEL_REGIME: Record<Regime, string> = {
  vegetarien: t('onboarding.regime_vegetarien'),
  vegan: t('onboarding.regime_vegan'),
  halal: t('onboarding.regime_halal'),
  sans_gluten: t('onboarding.regime_sans_gluten'),
  sans_lactose: t('onboarding.regime_sans_lactose'),
  sans_noix: t('onboarding.regime_sans_noix'),
  poisson: t('onboarding.regime_poisson'),
};

const LABEL_ENSEIGNE: Record<Enseigne, string> = {
  coop: t('onboarding.enseigne_coop'),
  migros: t('onboarding.enseigne_migros'),
  lidl: t('onboarding.enseigne_lidl'),
  aldi: t('onboarding.enseigne_aldi'),
  ottos: t('onboarding.enseigne_ottos'),
  manor_food: t('onboarding.enseigne_manor_food'),
};

function Stepper({ label, valeur, min, max, onChange }: { label: string; valeur: number; min: number; max: number; onChange: (v: number) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <BodySm>{label}</BodySm>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Pressable
          onPress={() => onChange(Math.max(min, valeur - 1))}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.age_diminuer', { label })}
          hitSlop={8}
          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' }}
        >
          <BodySm>–</BodySm>
        </Pressable>
        <BodySm style={{ minWidth: 28, textAlign: 'center' }}>{valeur}</BodySm>
        <Pressable
          onPress={() => onChange(Math.min(max, valeur + 1))}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.age_augmenter', { label })}
          hitSlop={8}
          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' }}
        >
          <BodySm>+</BodySm>
        </Pressable>
      </View>
    </View>
  );
}

function ChipToggle<T extends string>({ options, labels, selection, onToggle }: { options: T[]; labels: Record<T, string>; selection: T[]; onToggle: (v: T) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => (
        <Pressable
          key={o}
          onPress={() => onToggle(o)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: selection.includes(o) }}
          accessibilityLabel={labels[o]}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 9999,
            backgroundColor: selection.includes(o) ? colors.primary : colors.bgSecondary,
          }}
        >
          <BodySm style={{ color: selection.includes(o) ? '#FFFFFF' : colors.textPrimary }}>{labels[o]}</BodySm>
        </Pressable>
      ))}
    </View>
  );
}

export default function MonFoyer() {
  const { colors } = useTheme();
  const { profil, mettreAJourPreferences } = useProfilStore();
  const [allergieSaisie, setAllergieSaisie] = useState('');

  if (!profil) {
    return (
      <ScreenScroll contentContainerStyle={{ gap: 18 }} tabBar={false}>
        <Caption>{t('mon_foyer.non_connecte')}</Caption>
      </ScreenScroll>
    );
  }

  const toggleRegime = (r: Regime) => {
    const actuel = profil.regime;
    mettreAJourPreferences({ regime: actuel.includes(r) ? actuel.filter((x) => x !== r) : [...actuel, r] });
  };

  const toggleEnseigne = (e: Enseigne) => {
    const actuel = profil.enseignes_favorites;
    mettreAJourPreferences({ enseignes_favorites: actuel.includes(e) ? actuel.filter((x) => x !== e) : [...actuel, e] });
  };

  const ajouterAllergie = () => {
    const nomNettoye = allergieSaisie.trim();
    if (!nomNettoye) return;
    if (!profil.allergies.includes(nomNettoye)) {
      mettreAJourPreferences({ allergies: [...profil.allergies, nomNettoye] });
    }
    setAllergieSaisie('');
  };

  const retirerAllergie = (nom: string) => {
    mettreAJourPreferences({ allergies: profil.allergies.filter((a) => a !== nom) });
  };

  return (
    <ScreenScroll contentContainerStyle={{ gap: 18 }} tabBar={false}>
      <View>
        <DisplayLG>{t('mon_foyer.titre')}</DisplayLG>
        <BodySm>{t('mon_foyer.sous_titre')}</BodySm>
      </View>

      <Card style={{ padding: 20, gap: 14, borderRadius: 28, borderTopLeftRadius: 28 }}>
        <Heading>{t('profil.infos_foyer')}</Heading>
        <View style={{ gap: 6 }}>
          <Caption>{t('profil.prenom_label')}</Caption>
          <TextInput
            value={profil.prenom}
            onChangeText={(v) => mettreAJourPreferences({ prenom: v })}
            accessibilityLabel={t('profil.prenom_label')}
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.textPrimary }}
          />
        </View>
        <Stepper label={t('mon_foyer.nb_personnes')} valeur={profil.nb_personnes} min={1} max={20} onChange={(v) => mettreAJourPreferences({ nb_personnes: v })} />
        <Stepper label={t('mon_foyer.nb_enfants')} valeur={profil.nb_enfants} min={0} max={15} onChange={(v) => mettreAJourPreferences({ nb_enfants: v })} />
        <Stepper
          label={t('mon_foyer.budget_hebdo')}
          valeur={profil.budget_hebdo}
          min={10}
          max={2000}
          onChange={(v) => mettreAJourPreferences({ budget_hebdo: v })}
        />
      </Card>

      <Card style={{ padding: 20, gap: 14, borderRadius: 28, borderTopLeftRadius: 28 }}>
        <Heading>{t('onboarding.regime_titre')}</Heading>
        <ChipToggle options={REGIME_OPTIONS} labels={LABEL_REGIME} selection={profil.regime} onToggle={toggleRegime} />
      </Card>

      <Card style={{ padding: 20, gap: 10, borderRadius: 28, borderTopLeftRadius: 28 }}>
        <Heading>{t('onboarding.regime_autres')}</Heading>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput
            value={allergieSaisie}
            onChangeText={setAllergieSaisie}
            onSubmitEditing={ajouterAllergie}
            returnKeyType="done"
            placeholder={t('onboarding.regime_autres_placeholder')}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={t('onboarding.regime_autres_placeholder')}
            style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.textPrimary }}
          />
          <Pressable
            onPress={ajouterAllergie}
            disabled={!allergieSaisie.trim()}
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.regime_autres_ajouter')}
            style={{ paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, backgroundColor: allergieSaisie.trim() ? colors.primary : colors.border }}
          >
            <BodySm style={{ color: '#FFFFFF' }}>{t('onboarding.regime_autres_ajouter')}</BodySm>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {profil.allergies.map((a) => (
            <Pressable
              key={a}
              onPress={() => retirerAllergie(a)}
              accessibilityRole="button"
              accessibilityLabel={t('onboarding.regime_autres_retirer', { allergie: a })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 9999, backgroundColor: colors.bgSecondary }}
            >
              <BodySm>{a} ✕</BodySm>
            </Pressable>
          ))}
        </View>
        {profil.allergies.length > 0 && <Caption>{t('planning.disclaimer_medical')}</Caption>}
      </Card>

      <Card style={{ padding: 20, gap: 14, borderRadius: 28, borderTopLeftRadius: 28 }}>
        <Heading>{t('onboarding.enseignes_preferees')}</Heading>
        <ChipToggle options={ENSEIGNE_OPTIONS} labels={LABEL_ENSEIGNE} selection={profil.enseignes_favorites} onToggle={toggleEnseigne} />
      </Card>

      <Body style={{ textAlign: 'center' }}>{t('mon_foyer.enregistrement_auto')}</Body>
    </ScreenScroll>
  );
}
