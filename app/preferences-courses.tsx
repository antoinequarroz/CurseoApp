import React, { useState } from 'react';
import { Pressable, Switch, TextInput, View } from 'react-native';
import { Check, PackageCheck, Truck } from 'lucide-react-native';
import { router } from 'expo-router';
import { ScreenScroll } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Body, BodySm, Caption, DisplayLG, Heading } from '@/components/ui/Typography';
import { useTheme } from '@/lib/theme-context';
import { useProfilStore } from '@/stores/profilStore';
import { usePreferencesCourses } from '@/hooks/usePreferencesCourses';
import { PREFERENCES_COURSES_DEFAUT } from '@/lib/preferencesCoursesRepository';
import { t } from '@/lib/i18n';
import type { CreneauLivraisonPrefere, Enseigne, ModeSubstitution, PreferencesCoursesEnLigne } from '@/types';

// Le mode historique « demander » reste accepté en base mais n'est plus
// proposé : aucun SKU ne doit dépendre d'une sélection manuelle.
const MODES: ModeSubstitution[] = ['automatique_equivalent', 'jamais'];
const CRENEAUX: CreneauLivraisonPrefere[] = ['indifferent', 'matin', 'apres_midi', 'soir'];
const ENSEIGNES: Enseigne[] = ['migros', 'coop', 'aldi', 'lidl', 'ottos'];

function PucesNumeriques({
  valeurs,
  valeur,
  suffixe,
  onChange,
}: {
  valeurs: number[];
  valeur: number;
  suffixe: string;
  onChange: (valeur: number) => void;
}) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {valeurs.map((option) => {
        const selectionne = option === valeur;
        return (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ checked: selectionne }}
            onPress={() => onChange(option)}
            style={{
              minWidth: 52,
              minHeight: 44,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selectionne ? colors.primary : colors.bgSecondary,
            }}
          >
            <BodySm style={{ color: selectionne ? '#FFFFFF' : colors.textPrimary }}>
              {option} {suffixe}
            </BodySm>
          </Pressable>
        );
      })}
    </View>
  );
}

function Choix<T extends string>({
  valeurs,
  valeur,
  onChange,
  prefixe,
}: {
  valeurs: T[];
  valeur: T;
  onChange: (valeur: T) => void;
  prefixe: string;
}) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
      {valeurs.map((option) => {
        const selectionne = option === valeur;
        return (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ checked: selectionne }}
            onPress={() => onChange(option)}
            style={{
              minHeight: 52,
              paddingHorizontal: 14,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: selectionne ? colors.primary : colors.border,
              backgroundColor: selectionne ? colors.bgSecondary : colors.bgCard,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <BodySm style={{ flex: 1, fontWeight: selectionne ? '700' : '500' }}>
              {t(`${prefixe}.${option}`)}
            </BodySm>
            {selectionne ? <Check size={18} color={colors.primary} accessible={false} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function PreferencesCourses() {
  const { colors } = useTheme();
  const profil = useProfilStore((state) => state.profil);
  const query = usePreferencesCourses(profil?.id);
  const [formulaire, setFormulaire] = useState<PreferencesCoursesEnLigne>(PREFERENCES_COURSES_DEFAUT);
  const [marquesPreferees, setMarquesPreferees] = useState('');
  const [marquesRefusees, setMarquesRefusees] = useState('');
  const [sauvegarde, setSauvegarde] = useState(false);
  const [donneesChargees, setDonneesChargees] = useState(query.data);
  if (query.data && query.data !== donneesChargees) {
    setDonneesChargees(query.data);
    setFormulaire({
      ...query.data,
      substitutionMode:
        query.data.substitutionMode === 'demander'
          ? 'automatique_equivalent'
          : query.data.substitutionMode,
    });
    setMarquesPreferees(query.data.marquesPreferees.join(', '));
    setMarquesRefusees(query.data.marquesRefusees.join(', '));
  }

  const liste = (texte: string) =>
    texte
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 20);
  const enregistrer = async () => {
    setSauvegarde(false);
    await query.enregistrer({
      ...formulaire,
      marquesPreferees: liste(marquesPreferees),
      marquesRefusees: liste(marquesRefusees),
      instructionsLivraison: formulaire.instructionsLivraison.slice(0, 300),
    });
    setSauvegarde(true);
  };

  if (!profil) {
    return (
      <ScreenScroll tabBar={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: 16 }}>
        <Body>{t('preferences_courses.session_requise')}</Body>
        <Button label={t('commun.retour')} onPress={() => router.back()} />
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll tabBar={false} contentContainerStyle={{ gap: 20 }}>
      <View style={{ gap: 5 }}>
        <DisplayLG>{t('preferences_courses.titre')}</DisplayLG>
        <Body>{t('preferences_courses.description')}</Body>
      </View>
      {query.isLoading ? <Caption accessibilityLiveRegion="polite">{t('commun.chargement')}</Caption> : null}
      {query.isError ? (
        <Card style={{ padding: 16, gap: 10 }}>
          <BodySm accessibilityRole="alert">{t('preferences_courses.chargement_erreur')}</BodySm>
          <Button variant="secondary" label={t('commun.reessayer')} onPress={() => void query.refetch()} />
        </Card>
      ) : null}

      <Card style={{ padding: 18, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <PackageCheck size={21} color={colors.primary} accessible={false} />
          <Heading>{t('preferences_courses.substitutions_titre')}</Heading>
        </View>
        <Caption>{t('preferences_courses.substitutions_aide')}</Caption>
        <Choix
          valeurs={MODES}
          valeur={formulaire.substitutionMode}
          onChange={(substitutionMode) => setFormulaire((actuel) => ({ ...actuel, substitutionMode }))}
          prefixe="preferences_courses.mode"
        />
        <BodySm>{t('preferences_courses.ecart_prix', { count: formulaire.variationPrixMaxPct })}</BodySm>
        <PucesNumeriques
          valeurs={[0, 5, 10, 20]}
          valeur={formulaire.variationPrixMaxPct}
          suffixe="%"
          onChange={(variationPrixMaxPct) => setFormulaire((actuel) => ({ ...actuel, variationPrixMaxPct }))}
        />
        <BodySm>{t('preferences_courses.marques_preferees')}</BodySm>
        <TextInput
          value={marquesPreferees}
          onChangeText={setMarquesPreferees}
          placeholder={t('preferences_courses.marques_exemple')}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={t('preferences_courses.marques_preferees')}
          style={{
            minHeight: 48,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 14,
            paddingHorizontal: 14,
            color: colors.textPrimary,
          }}
        />
        <BodySm>{t('preferences_courses.marques_refusees')}</BodySm>
        <TextInput
          value={marquesRefusees}
          onChangeText={setMarquesRefusees}
          placeholder={t('preferences_courses.marques_exemple')}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={t('preferences_courses.marques_refusees')}
          style={{
            minHeight: 48,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 14,
            paddingHorizontal: 14,
            color: colors.textPrimary,
          }}
        />
      </Card>

      <Card style={{ padding: 18, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Truck size={21} color={colors.primary} accessible={false} />
          <Heading>{t('preferences_courses.livraison_titre')}</Heading>
        </View>
        <View
          style={{
            minHeight: 48,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <BodySm style={{ flex: 1 }}>{t('preferences_courses.sans_contact')}</BodySm>
          <Switch
            value={formulaire.livraisonSansContact}
            onValueChange={(livraisonSansContact) =>
              setFormulaire((actuel) => ({ ...actuel, livraisonSansContact }))
            }
            trackColor={{ true: colors.primary }}
          />
        </View>
        <BodySm>{t('preferences_courses.creneau')}</BodySm>
        <Choix
          valeurs={CRENEAUX}
          valeur={formulaire.creneauPrefere}
          onChange={(creneauPrefere) => setFormulaire((actuel) => ({ ...actuel, creneauPrefere }))}
          prefixe="preferences_courses.creneau_option"
        />
        <BodySm>{t('preferences_courses.frais_max', { count: formulaire.fraisLivraisonMax })}</BodySm>
        <PucesNumeriques
          valeurs={[0, 10, 20, 40]}
          valeur={formulaire.fraisLivraisonMax}
          suffixe="CHF"
          onChange={(fraisLivraisonMax) => setFormulaire((actuel) => ({ ...actuel, fraisLivraisonMax }))}
        />
        <BodySm>{t('preferences_courses.enseignes')}</BodySm>
        <Caption>{t('preferences_courses.enseignes_aide')}</Caption>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {ENSEIGNES.map((enseigne) => {
            const selectionnee = formulaire.enseignesAutorisees.includes(enseigne);
            return (
              <Pressable
                key={enseigne}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selectionnee }}
                onPress={() =>
                  setFormulaire((actuel) => ({
                    ...actuel,
                    enseignesAutorisees: selectionnee
                      ? actuel.enseignesAutorisees.filter((item) => item !== enseigne)
                      : [...actuel.enseignesAutorisees, enseigne],
                  }))
                }
                style={{
                  minHeight: 44,
                  paddingHorizontal: 14,
                  borderRadius: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 7,
                  borderWidth: 1,
                  borderColor: selectionnee ? colors.primary : colors.border,
                  backgroundColor: selectionnee ? colors.bgSecondary : colors.bgCard,
                }}
              >
                {selectionnee ? <Check size={16} color={colors.primary} accessible={false} /> : null}
                <BodySm>{t(`checkout.enseigne_${enseigne}`)}</BodySm>
              </Pressable>
            );
          })}
        </View>
        <BodySm>{t('preferences_courses.instructions')}</BodySm>
        <TextInput
          value={formulaire.instructionsLivraison}
          onChangeText={(instructionsLivraison) =>
            setFormulaire((actuel) => ({ ...actuel, instructionsLivraison }))
          }
          maxLength={300}
          multiline
          placeholder={t('preferences_courses.instructions_exemple')}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={t('preferences_courses.instructions')}
          style={{
            minHeight: 96,
            textAlignVertical: 'top',
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 14,
            padding: 14,
            color: colors.textPrimary,
          }}
        />
        <Caption>{t('preferences_courses.non_transmises')}</Caption>
      </Card>

      {sauvegarde ? (
        <BodySm accessibilityLiveRegion="polite">{t('preferences_courses.enregistre')}</BodySm>
      ) : null}
      <Button
        label={t('commun.enregistrer')}
        loading={query.enregistrementEnCours}
        onPress={() => void enregistrer()}
      />
    </ScreenScroll>
  );
}
