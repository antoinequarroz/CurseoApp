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
import { useTheme } from '@/lib/theme-context';
import { useHaptics } from '@/hooks/useHaptics';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useProfilStore } from '@/stores/profilStore';
import { supabase } from '@/lib/supabase';
import { analytics } from '@/lib/analytics';
import { KeyboardView } from '@/components/ui/KeyboardView';
import { Button } from '@/components/ui/Button';
import { DisplayXL, Body, BodySm, Caption, Price } from '@/components/ui/Typography';
import { formatPrix } from '@/lib/format';
import type { Enseigne, Objectif, Regime } from '@/types';

const TOTAL_ETAPES = 5;
const REGIMES: { id: Regime; label: string }[] = [
  { id: 'vegetarien', label: 'Végétarien' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'halal', label: 'Halal' },
  { id: 'sans_gluten', label: 'Sans gluten' },
  { id: 'sans_lactose', label: 'Sans lactose' },
];
const OBJECTIFS: { id: Objectif; label: string }[] = [
  { id: 'perdre_poids', label: 'Perdre du poids' },
  { id: 'prise_masse', label: 'Prise de masse' },
  { id: 'manger_sain', label: 'Manger sainement' },
  { id: 'rapide', label: 'Repas rapides' },
];
const ENSEIGNES: { id: Enseigne; label: string }[] = [
  { id: 'coop', label: 'Coop' },
  { id: 'migros', label: 'Migros' },
  { id: 'lidl', label: 'Lidl' },
  { id: 'aldi', label: 'Aldi' },
];

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
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: 20 }}>
        {/* Progress bar */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 24, marginTop: 12 }}>
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

        <Animated.View key={etapeActuelle} entering={SlideInRight.duration(250)} exiting={SlideOutLeft.duration(250)} style={{ flex: 1, gap: 16 }}>
          {etapeActuelle === 1 && (
            <View style={{ gap: 16 }}>
              <DisplayXL>Bienvenue sur Courseo</DisplayXL>
              <BodySm>Ton copilote repas et courses pour la Suisse</BodySm>
              <TextInput
                value={donneesPartielles.prenom ?? ''}
                onChangeText={(v) => mettreAJourDonnees({ prenom: v })}
                placeholder="Nom du foyer / ton prénom"
                placeholderTextColor={colors.textMuted}
                accessibilityLabel="Nom du foyer"
                style={{ backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, color: colors.textPrimary }}
              />
              <Pressable
                onPress={() => setCgvuAcceptees((v) => !v)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: cgvuAcceptees }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: colors.primary, backgroundColor: cgvuAcceptees ? colors.primary : 'transparent' }} />
                <Caption>J&apos;accepte les CGVU de Courseo</Caption>
              </Pressable>
            </View>
          )}

          {etapeActuelle === 2 && (
            <View style={{ gap: 16 }}>
              <DisplayXL>Qui mange à la maison ?</DisplayXL>
              <Body>Nombre de personnes : {donneesPartielles.nb_personnes ?? 1}</Body>
              <Slider
                minimumValue={1}
                maximumValue={10}
                step={1}
                value={donneesPartielles.nb_personnes ?? 1}
                onValueChange={(v) => mettreAJourDonnees({ nb_personnes: Math.round(v) })}
                minimumTrackTintColor={colors.primary}
                accessibilityLabel="Nombre de personnes dans le foyer"
              />
              <Body>Dont enfants : {donneesPartielles.nb_enfants ?? 0}</Body>
              <Slider
                minimumValue={0}
                maximumValue={8}
                step={1}
                value={donneesPartielles.nb_enfants ?? 0}
                onValueChange={(v) => mettreAJourDonnees({ nb_enfants: Math.round(v) })}
                minimumTrackTintColor={colors.primary}
                accessibilityLabel="Nombre d'enfants"
              />
            </View>
          )}

          {etapeActuelle === 3 && (
            <View style={{ gap: 16 }}>
              <DisplayXL>Budget hebdomadaire</DisplayXL>
              <Price style={{ fontSize: 32 }}>{formatPrix(donneesPartielles.budget_hebdo ?? 150)}</Price>
              <Slider
                minimumValue={50}
                maximumValue={500}
                step={10}
                value={donneesPartielles.budget_hebdo ?? 150}
                onValueChange={(v) => mettreAJourDonnees({ budget_hebdo: v })}
                minimumTrackTintColor={colors.primary}
                accessibilityLabel="Budget hebdomadaire en francs suisses"
                accessibilityHint="Glisse pour ajuster ton budget entre 50 et 500 francs"
              />
            </View>
          )}

          {etapeActuelle === 4 && (
            <View style={{ gap: 16 }}>
              <DisplayXL>Régimes et allergies</DisplayXL>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {REGIMES.map((r) => (
                  <Chip key={r.id} label={r.label} selected={(donneesPartielles.regime ?? []).includes(r.id)} onPress={() => toggleRegime(r.id)} />
                ))}
              </View>
            </View>
          )}

          {etapeActuelle === 5 && (
            <View style={{ gap: 16 }}>
              <DisplayXL>Objectifs et enseignes</DisplayXL>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {OBJECTIFS.map((o) => (
                  <Chip key={o.id} label={o.label} selected={(donneesPartielles.objectifs ?? []).includes(o.id)} onPress={() => toggleObjectif(o.id)} />
                ))}
              </View>
              <Body>Tes enseignes préférées</Body>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {ENSEIGNES.map((e) => (
                  <Chip key={e.id} label={e.label} selected={(donneesPartielles.enseignes_favorites ?? []).includes(e.id)} onPress={() => toggleEnseigne(e.id)} />
                ))}
              </View>
            </View>
          )}
        </Animated.View>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          {etapeActuelle > 1 && <Button label="Précédent" variant="secondary" onPress={precedent} />}
          <View style={{ flex: 1 }}>
            <Button
              label={etapeActuelle === TOTAL_ETAPES ? 'Terminer' : 'Suivant'}
              onPress={suivant}
              disabled={etapeActuelle === 1 && !cgvuAcceptees}
            />
          </View>
        </View>
      </View>
    </KeyboardView>
  );
}
