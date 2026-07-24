/** COUR-24 : gestion des membres du foyer (régime/allergies par personne) — réservé au palier Famille. */
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Lock, Pencil, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/lib/theme-context';
import { useAbonnement } from '@/hooks/useAbonnement';
import { useMembresFoyer } from '@/hooks/useMembresFoyer';
import { toast } from '@/lib/toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonMembresFoyer } from '@/components/ui/Skeleton';
import { PaywallModal } from '@/components/ui/PaywallModal';
import { ScreenScroll } from '@/components/ui/Screen';
import { DisplayLG, Heading, Body, BodySm, Caption } from '@/components/ui/Typography';
import { t } from '@/lib/i18n';
import type { DonneesMembre } from '@/lib/membresFoyerRepository';
import type { MembreFoyer, Regime } from '@/types';

const REGIME_OPTIONS: Regime[] = ['vegetarien', 'vegan', 'halal', 'sans_gluten', 'sans_lactose', 'sans_noix', 'poisson'];

const LABEL_REGIME: Record<Regime, string> = {
  vegetarien: t('onboarding.regime_vegetarien'),
  vegan: t('onboarding.regime_vegan'),
  halal: t('onboarding.regime_halal'),
  sans_gluten: t('onboarding.regime_sans_gluten'),
  sans_lactose: t('onboarding.regime_sans_lactose'),
  sans_noix: t('onboarding.regime_sans_noix'),
  poisson: t('onboarding.regime_poisson'),
};

const MEMBRE_VIDE: DonneesMembre = { prenom: '', age: null, regime: [], allergies: [] };

function MembreFormulaire({
  initial,
  enregistrementEnCours,
  onAnnuler,
  onEnregistrer,
}: {
  initial: DonneesMembre;
  enregistrementEnCours: boolean;
  onAnnuler: () => void;
  onEnregistrer: (donnees: DonneesMembre) => void;
}) {
  const { colors } = useTheme();
  const [prenom, setPrenom] = useState(initial.prenom);
  const [ageSaisi, setAgeSaisi] = useState(initial.age !== null ? String(initial.age) : '');
  const [regime, setRegime] = useState<Regime[]>(initial.regime);
  const [allergies, setAllergies] = useState<string[]>(initial.allergies);
  const [allergieSaisie, setAllergieSaisie] = useState('');

  const toggleRegime = (r: Regime) => {
    setRegime((actuel) => (actuel.includes(r) ? actuel.filter((x) => x !== r) : [...actuel, r]));
  };

  const ajouterAllergie = () => {
    const nomNettoye = allergieSaisie.trim();
    if (!nomNettoye) return;
    if (!allergies.includes(nomNettoye)) setAllergies((actuel) => [...actuel, nomNettoye]);
    setAllergieSaisie('');
  };

  const retirerAllergie = (nom: string) => setAllergies((actuel) => actuel.filter((a) => a !== nom));

  const valider = () => {
    const nomNettoye = prenom.trim();
    if (!nomNettoye) {
      toast.erreur(t('famille.prenom_requis'));
      return;
    }
    const age = ageSaisi.trim() ? Number.parseInt(ageSaisi, 10) : null;
    onEnregistrer({ prenom: nomNettoye, age: age !== null && Number.isFinite(age) ? age : null, regime, allergies });
  };

  return (
    <Card style={{ padding: 20, gap: 14, borderRadius: 28, borderTopLeftRadius: 28 }}>
      <View style={{ gap: 6 }}>
        <Caption>{t('famille.prenom_label')}</Caption>
        <TextInput
          value={prenom}
          onChangeText={setPrenom}
          placeholder={t('famille.prenom_placeholder')}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={t('famille.prenom_label')}
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.textPrimary }}
        />
      </View>

      <View style={{ gap: 6 }}>
        <Caption>{t('famille.age_label')}</Caption>
        <TextInput
          value={ageSaisi}
          onChangeText={setAgeSaisi}
          placeholder={t('famille.age_placeholder')}
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          accessibilityLabel={t('famille.age_label')}
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.textPrimary }}
        />
      </View>

      <View style={{ gap: 6 }}>
        <Caption>{t('famille.regime_label')}</Caption>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {REGIME_OPTIONS.map((r) => (
            <Pressable
              key={r}
              onPress={() => toggleRegime(r)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: regime.includes(r) }}
              accessibilityLabel={LABEL_REGIME[r]}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 9999,
                backgroundColor: regime.includes(r) ? colors.primary : colors.bgSecondary,
              }}
            >
              <BodySm style={{ color: regime.includes(r) ? '#FFFFFF' : colors.textPrimary }}>{LABEL_REGIME[r]}</BodySm>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Caption>{t('famille.allergies_label')}</Caption>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput
            value={allergieSaisie}
            onChangeText={setAllergieSaisie}
            onSubmitEditing={ajouterAllergie}
            returnKeyType="done"
            placeholder={t('famille.allergie_placeholder')}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={t('famille.allergie_placeholder')}
            style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.textPrimary }}
          />
          <Pressable
            onPress={ajouterAllergie}
            disabled={!allergieSaisie.trim()}
            accessibilityRole="button"
            accessibilityLabel={t('famille.allergie_ajouter')}
            style={{ paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, backgroundColor: allergieSaisie.trim() ? colors.primary : colors.border }}
          >
            <BodySm style={{ color: '#FFFFFF' }}>{t('famille.allergie_ajouter')}</BodySm>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {allergies.map((a) => (
            <Pressable
              key={a}
              onPress={() => retirerAllergie(a)}
              accessibilityRole="button"
              accessibilityLabel={t('famille.allergie_retirer', { allergie: a })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 9999, backgroundColor: colors.bgSecondary }}
            >
              <BodySm>{a} ✕</BodySm>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button label={t('commun.annuler')} variant="secondary" onPress={onAnnuler} disabled={enregistrementEnCours} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label={t('famille.enregistrer')} onPress={valider} loading={enregistrementEnCours} />
        </View>
      </View>
    </Card>
  );
}

function MembreLigne({
  membre,
  onModifier,
  onRetirer,
}: {
  membre: MembreFoyer;
  onModifier: () => void;
  onRetirer: () => void;
}) {
  const { colors } = useTheme();
  const [confirmationRetrait, setConfirmationRetrait] = useState(false);

  return (
    <Card style={{ padding: 16, gap: 10, borderRadius: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Body>{membre.prenom}</Body>
          {membre.age !== null && <Caption>{t('famille.age_label')} : {membre.age}</Caption>}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={onModifier} accessibilityRole="button" accessibilityLabel={t('famille.modifier_label', { prenom: membre.prenom })} hitSlop={8}>
            <Pencil size={18} color={colors.textMuted} />
          </Pressable>
          <Pressable onPress={() => setConfirmationRetrait(true)} accessibilityRole="button" accessibilityLabel={t('famille.retirer_label', { prenom: membre.prenom })} hitSlop={8}>
            <Trash2 size={18} color={colors.error} />
          </Pressable>
        </View>
      </View>

      {(membre.regime.length > 0 || membre.allergies.length > 0) && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {membre.regime.map((r) => (
            <View key={r} style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 9999, backgroundColor: colors.bgSecondary }}>
              <Caption>{LABEL_REGIME[r] ?? r}</Caption>
            </View>
          ))}
          {membre.allergies.map((a) => (
            <View key={a} style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 9999, backgroundColor: colors.warningBg }}>
              <Caption style={{ color: colors.chipTextWarning }}>{a}</Caption>
            </View>
          ))}
        </View>
      )}

      {confirmationRetrait && (
        <View style={{ gap: 8 }}>
          <BodySm>{t('famille.confirmer_retrait', { prenom: membre.prenom })}</BodySm>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button label={t('commun.annuler')} variant="secondary" onPress={() => setConfirmationRetrait(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={t('commun.confirmer')} variant="secondary" onPress={onRetirer} />
            </View>
          </View>
        </View>
      )}
    </Card>
  );
}

export default function MembresFoyer() {
  const { colors } = useTheme();
  const { estAuMoins } = useAbonnement();
  const [paywallVisible, setPaywallVisible] = useState(false);

  if (!estAuMoins('famille')) {
    return (
      <ScreenScroll contentContainerStyle={{ gap: 18 }} tabBar={false}>
        <View>
          <DisplayLG>{t('famille.titre')}</DisplayLG>
          <BodySm>{t('famille.sous_titre')}</BodySm>
        </View>
        <Card style={{ padding: 20, gap: 10, borderRadius: 28, borderTopLeftRadius: 28, alignItems: 'flex-start' }}>
          <Lock size={22} color={colors.textMuted} />
          <Heading>{t('famille.paywall_titre')}</Heading>
          <Body>{t('famille.paywall_description')}</Body>
          <Button label={t('famille.debloquer')} onPress={() => setPaywallVisible(true)} />
        </Card>
        <PaywallModal
          visible={paywallVisible}
          onClose={() => setPaywallVisible(false)}
          onChoisir={() => setPaywallVisible(false)}
          featureOrigine="membres_foyer"
        />
      </ScreenScroll>
    );
  }

  return <GestionMembres />;
}

function GestionMembres() {
  const { colors } = useTheme();
  const { isLoading, isError, isEmpty, membres, limite, limiteAtteinte, mutationEnCours, refetch, ajouter, modifier, retirer } = useMembresFoyer();
  const [mode, setMode] = useState<'liste' | 'ajout' | { edition: MembreFoyer }>('liste');

  const fermerFormulaire = () => setMode('liste');

  const enregistrer = async (donnees: DonneesMembre) => {
    try {
      if (mode === 'ajout') {
        await ajouter(donnees);
        toast.succes(t('famille.membre_ajoute'));
      } else if (typeof mode === 'object') {
        await modifier(mode.edition.id, donnees);
        toast.succes(t('famille.membre_modifie'));
      }
      setMode('liste');
    } catch {
      toast.erreur(t('famille.erreur_generique'));
    }
  };

  const retirerMembre = async (membreId: string) => {
    try {
      await retirer(membreId);
      toast.succes(t('famille.membre_retire'));
    } catch {
      toast.erreur(t('famille.erreur_generique'));
    }
  };

  return (
    <ScreenScroll contentContainerStyle={{ gap: 18 }} tabBar={false}>
      <View>
        <DisplayLG>{t('famille.titre')}</DisplayLG>
        <BodySm>{t('famille.sous_titre')}</BodySm>
      </View>

      {isLoading ? (
        <SkeletonMembresFoyer />
      ) : isError ? (
        <EmptyState
          illustration="famille"
          titre={t('famille.erreur_titre')}
          sousTitre={t('famille.erreur_soustitre')}
          ctaLabel={t('commun.reessayer')}
          onCta={() => refetch()}
        />
      ) : (
        <>
          {mode === 'ajout' && (
            <MembreFormulaire initial={MEMBRE_VIDE} enregistrementEnCours={mutationEnCours} onAnnuler={fermerFormulaire} onEnregistrer={enregistrer} />
          )}
          {typeof mode === 'object' && (
            <MembreFormulaire
              initial={{ prenom: mode.edition.prenom, age: mode.edition.age, regime: mode.edition.regime, allergies: mode.edition.allergies }}
              enregistrementEnCours={mutationEnCours}
              onAnnuler={fermerFormulaire}
              onEnregistrer={enregistrer}
            />
          )}

          {mode === 'liste' && isEmpty && (
            <EmptyState
              illustration="famille"
              titre={t('famille.vide_titre')}
              sousTitre={t('famille.vide_soustitre')}
              ctaLabel={t('famille.ajouter_membre')}
              onCta={() => setMode('ajout')}
            />
          )}

          {mode === 'liste' && !isEmpty && (
            <View style={{ gap: 12 }}>
              {membres.map((m) => (
                <MembreLigne key={m.id} membre={m} onModifier={() => setMode({ edition: m })} onRetirer={() => void retirerMembre(m.id)} />
              ))}
            </View>
          )}

          {mode === 'liste' && !isEmpty && (
            <View style={{ gap: 8 }}>
              {limiteAtteinte && <Caption style={{ color: colors.warning }}>{t('famille.limite_atteinte', { limite })}</Caption>}
              <Button label={t('famille.ajouter_membre')} onPress={() => setMode('ajout')} disabled={limiteAtteinte} />
            </View>
          )}
        </>
      )}
    </ScreenScroll>
  );
}
