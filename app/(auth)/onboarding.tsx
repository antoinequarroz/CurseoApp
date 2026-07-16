/**
 * Onboarding en 5 etapes avec progress bar et transition slide + fade croise.
 * L'etat est persiste (useOnboardingStore) pour permettre une reprise a
 * mi-parcours si l'utilisateur quitte l'app en cours de route.
 */
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Slider from '@react-native-community/slider';
import Animated, { SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Check, Leaf, Sprout, WheatOff, MilkOff, NutOff, Drumstick, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/lib/theme-context';
import { useHaptics } from '@/hooks/useHaptics';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useProfilStore } from '@/stores/profilStore';
import { supabase } from '@/lib/supabase';
import { analytics } from '@/lib/analytics';
import { KeyboardView } from '@/components/ui/KeyboardView';
import { RegimeParPersonneTeaser } from '@/components/ui/RegimeParPersonneTeaser';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { DisplayXL, Body, BodySm, Caption, PriceXL } from '@/components/ui/Typography';
import { formatPrix } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { Enseigne, Objectif, Regime } from '@/types';

const TOTAL_ETAPES = 5;
const REGIMES: { id: Regime; label: string; Icon: LucideIcon }[] = [
  { id: 'vegetarien', label: t('onboarding.regime_vegetarien'), Icon: Leaf },
  { id: 'vegan', label: t('onboarding.regime_vegan'), Icon: Sprout },
  { id: 'sans_gluten', label: t('onboarding.regime_sans_gluten'), Icon: WheatOff },
  { id: 'sans_lactose', label: t('onboarding.regime_sans_lactose'), Icon: MilkOff },
  { id: 'sans_noix', label: t('onboarding.regime_sans_noix'), Icon: NutOff },
  { id: 'halal', label: t('onboarding.regime_halal'), Icon: Drumstick },
];
const OBJECTIFS: { id: Objectif; label: string }[] = [
  { id: 'perdre_poids', label: t('onboarding.objectif_perdre_poids') },
  { id: 'prise_masse', label: t('onboarding.objectif_prise_masse') },
  { id: 'manger_sain', label: t('onboarding.objectif_manger_sain') },
  { id: 'rapide', label: t('onboarding.objectif_rapide') },
  { id: 'diminuer_charge_mentale', label: t('onboarding.objectif_diminuer_charge_mentale') },
  { id: 'maitriser_budget', label: t('onboarding.objectif_maitriser_budget') },
  { id: 'manger_varie', label: t('onboarding.objectif_manger_varie') },
  { id: 'reduire_gaspillage', label: t('onboarding.objectif_reduire_gaspillage') },
];
const ENSEIGNES: { id: Enseigne; label: string }[] = [
  { id: 'coop', label: t('onboarding.enseigne_coop') },
  { id: 'migros', label: t('onboarding.enseigne_migros') },
  { id: 'lidl', label: t('onboarding.enseigne_lidl') },
  { id: 'aldi', label: t('onboarding.enseigne_aldi') },
];

const AGE_PAR_DEFAUT = 5;
const AGE_MIN = 0;
const AGE_MAX = 17;

function StepperAge({ label, age, onChange }: { label: string; age: number; onChange: (age: number) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
      <Body>{label}</Body>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Pressable
          onPress={() => onChange(Math.max(AGE_MIN, age - 1))}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.age_diminuer', { label })}
          hitSlop={8}
          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Body>–</Body>
        </Pressable>
        <Body style={{ minWidth: 28, textAlign: 'center' }}>{age}</Body>
        <Pressable
          onPress={() => onChange(Math.min(AGE_MAX, age + 1))}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.age_augmenter', { label })}
          hitSlop={8}
          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgSecondary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Body>+</Body>
        </Pressable>
      </View>
    </View>
  );
}

function IconTile({ label, Icon, selected, onPress }: { label: string; Icon: LucideIcon; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={{
        width: '31%',
        gap: 8,
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: selected ? colors.primary : colors.bgSecondary,
      }}
    >
      <Icon size={22} color={selected ? '#FFFFFF' : colors.textPrimary} />
      <BodySm style={{ color: selected ? '#FFFFFF' : colors.textPrimary, textAlign: 'center' }}>{label}</BodySm>
    </Pressable>
  );
}

function CheckRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 14,
        backgroundColor: colors.bgSecondary,
      }}
    >
      <Body>{label}</Body>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          borderColor: selected ? colors.success : colors.border,
          backgroundColor: selected ? colors.success : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
      </View>
    </Pressable>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={{
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 9999,
        backgroundColor: selected ? colors.primary : colors.bgSecondary,
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Body style={{ color: selected ? '#FFFFFF' : colors.textPrimary }}>{label}</Body>
    </Pressable>
  );
}

export default function Onboarding() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const { etapeActuelle, donneesPartielles, setEtape, mettreAJourDonnees, terminer } = useOnboardingStore();
  const [cgvuAcceptees, setCgvuAcceptees] = useState(false);

  const suivant = () => {
    void haptics.selection();
    if (etapeActuelle < TOTAL_ETAPES) {
      setEtape(etapeActuelle + 1);
    } else {
      finaliser();
    }
  };
  const precedent = () => {
    if (etapeActuelle > 1) setEtape(etapeActuelle - 1);
  };

  const finaliser = async () => {
    const { data: session } = await supabase.auth.getSession();
    const profilComplet = {
      id: session.session?.user.id ?? 'demo-user',
      prenom: donneesPartielles.prenom ?? 'Toi',
      nb_personnes: donneesPartielles.nb_personnes ?? 1,
      nb_enfants: donneesPartielles.nb_enfants ?? 0,
      enfants_ages: donneesPartielles.enfants_ages ?? [],
      budget_hebdo: donneesPartielles.budget_hebdo ?? 150,
      regime: donneesPartielles.regime ?? [],
      allergies: donneesPartielles.allergies ?? [],
      objectifs: donneesPartielles.objectifs ?? [],
      enseignes_favorites: donneesPartielles.enseignes_favorites ?? [],
      abonnement: 'gratuit' as const,
      notifications_activees: true,
      notifications_planning: true,
      notifications_budget: true,
      notifications_promos: false,
      notifications_bilan: true,
      apparence: 'auto' as const,
      cgvu_version_acceptee: cgvuAcceptees ? '1.0' : null,
    };
    useProfilStore.getState().setProfil(profilComplet);
    if (session.session?.user) {
      await supabase.from('profils').upsert(profilComplet);
    }
    terminer();
    analytics.onboardingCompleted();
    void haptics.success();
    router.replace('/(tabs)');
  };

  const changerNbEnfants = (nb: number) => {
    const agesActuels = donneesPartielles.enfants_ages ?? [];
    const nouveauxAges =
      nb > agesActuels.length
        ? [...agesActuels, ...Array(nb - agesActuels.length).fill(AGE_PAR_DEFAUT)]
        : agesActuels.slice(0, nb);
    mettreAJourDonnees({ nb_enfants: nb, enfants_ages: nouveauxAges });
  };
  const changerAgeEnfant = (index: number, age: number) => {
    const ages = [...(donneesPartielles.enfants_ages ?? [])];
    ages[index] = age;
    mettreAJourDonnees({ enfants_ages: ages });
  };

  const toggleRegime = (id: Regime) => {
    const actuel = donneesPartielles.regime ?? [];
    mettreAJourDonnees({ regime: actuel.includes(id) ? actuel.filter((r) => r !== id) : [...actuel, id] });
  };
  const toggleObjectif = (id: Objectif) => {
    const actuel = donneesPartielles.objectifs ?? [];
    mettreAJourDonnees({ objectifs: actuel.includes(id) ? actuel.filter((o) => o !== id) : [...actuel, id] });
  };
  const toggleEnseigne = (id: Enseigne) => {
    const actuel = donneesPartielles.enseignes_favorites ?? [];
    mettreAJourDonnees({
      enseignes_favorites: actuel.includes(id) ? actuel.filter((e) => e !== id) : [...actuel, id],
    });
  };

  return (
    <KeyboardView>
      <Screen style={{ gap: 16 }}>
        {/* Progress bar */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
          {Array.from({ length: TOTAL_ETAPES }).map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: i < etapeActuelle ? colors.primary : colors.bgSecondary,
              }}
            />
          ))}
        </View>

        <Animated.ScrollView
          key={etapeActuelle}
          entering={SlideInRight.duration(250)}
          exiting={SlideOutLeft.duration(250)}
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: 16, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {etapeActuelle === 1 && (
            <View style={{ gap: 16 }}>
              <DisplayXL>{t('onboarding.bienvenue_titre')}</DisplayXL>
              <BodySm>{t('onboarding.bienvenue_sous_titre')}</BodySm>
              <TextInput
                value={donneesPartielles.prenom ?? ''}
                onChangeText={(v) => mettreAJourDonnees({ prenom: v })}
                placeholder={t('onboarding.nom_placeholder')}
                placeholderTextColor={colors.textMuted}
                accessibilityLabel={t('onboarding.nom_foyer_label')}
                style={{ backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, color: colors.textPrimary }}
              />
              <Pressable
                onPress={() => setCgvuAcceptees((v) => !v)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: cgvuAcceptees }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: colors.primary, backgroundColor: cgvuAcceptees ? colors.primary : 'transparent' }} />
                <Caption>{t('onboarding.cgvu_accept')}</Caption>
              </Pressable>
            </View>
          )}

          {etapeActuelle === 2 && (
            <View style={{ gap: 16 }}>
              <DisplayXL>{t('onboarding.composition_titre')}</DisplayXL>
              <Body>{t('onboarding.nb_personnes', { count: donneesPartielles.nb_personnes ?? 1 })}</Body>
              <Slider
                minimumValue={1}
                maximumValue={10}
                step={1}
                value={donneesPartielles.nb_personnes ?? 1}
                onValueChange={(v) => mettreAJourDonnees({ nb_personnes: Math.round(v) })}
                minimumTrackTintColor={colors.primary}
                accessibilityLabel={t('onboarding.nb_personnes_label')}
              />
              <Body>{t('onboarding.nb_enfants', { count: donneesPartielles.nb_enfants ?? 0 })}</Body>
              <Slider
                minimumValue={0}
                maximumValue={8}
                step={1}
                value={donneesPartielles.nb_enfants ?? 0}
                onValueChange={(v) => changerNbEnfants(Math.round(v))}
                minimumTrackTintColor={colors.primary}
                accessibilityLabel={t('onboarding.nb_enfants_label')}
              />
              {(donneesPartielles.nb_enfants ?? 0) > 0 && (
                <View style={{ gap: 4 }}>
                  <Caption>{t('onboarding.ages_enfants_hint')}</Caption>
                  {(donneesPartielles.enfants_ages ?? []).map((age, index) => (
                    <StepperAge
                      key={index}
                      label={t('onboarding.age_enfant', { numero: index + 1 })}
                      age={age}
                      onChange={(nouvelAge) => changerAgeEnfant(index, nouvelAge)}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {etapeActuelle === 3 && (
            <View style={{ gap: 16 }}>
              <DisplayXL>{t('onboarding.budget_titre_court')}</DisplayXL>
              <PriceXL>{formatPrix(donneesPartielles.budget_hebdo ?? 150)}</PriceXL>
              <Slider
                minimumValue={50}
                maximumValue={500}
                step={10}
                value={donneesPartielles.budget_hebdo ?? 150}
                onValueChange={(v) => mettreAJourDonnees({ budget_hebdo: v })}
                minimumTrackTintColor={colors.primary}
                accessibilityLabel={t('onboarding.budget_label')}
                accessibilityHint={t('onboarding.budget_hint')}
              />
            </View>
          )}

          {etapeActuelle === 4 && (
            <View style={{ gap: 16 }}>
              <DisplayXL>{t('onboarding.regime_titre')}</DisplayXL>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {REGIMES.map((r) => (
                  <IconTile
                    key={r.id}
                    label={r.label}
                    Icon={r.Icon}
                    selected={(donneesPartielles.regime ?? []).includes(r.id)}
                    onPress={() => toggleRegime(r.id)}
                  />
                ))}
              </View>
              <RegimeParPersonneTeaser />
              <Button label={t('onboarding.regime_passer')} variant="ghost" onPress={suivant} />
            </View>
          )}

          {etapeActuelle === 5 && (
            <View style={{ gap: 16 }}>
              <DisplayXL>{t('onboarding.objectifs_titre_court')}</DisplayXL>
              <View style={{ gap: 8 }}>
                {OBJECTIFS.map((o) => (
                  <CheckRow key={o.id} label={o.label} selected={(donneesPartielles.objectifs ?? []).includes(o.id)} onPress={() => toggleObjectif(o.id)} />
                ))}
              </View>
              <Body>{t('onboarding.enseignes_preferees')}</Body>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {ENSEIGNES.map((e) => (
                  <Chip key={e.id} label={e.label} selected={(donneesPartielles.enseignes_favorites ?? []).includes(e.id)} onPress={() => toggleEnseigne(e.id)} />
                ))}
              </View>
            </View>
          )}
        </Animated.ScrollView>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          {etapeActuelle > 1 && <Button label={t('commun.precedent')} variant="secondary" onPress={precedent} />}
          <View style={{ flex: 1 }}>
            <Button
              label={etapeActuelle === TOTAL_ETAPES ? t('commun.terminer') : t('commun.suivant')}
              onPress={suivant}
              disabled={etapeActuelle === 1 && !cgvuAcceptees}
            />
          </View>
        </View>
      </Screen>
    </KeyboardView>
  );
}
