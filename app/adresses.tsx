/** COUR-28 : gestion des adresses de livraison — ajout/modification/suppression avec validation NPA suisse. */
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Pencil, Star, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/lib/theme-context';
import { useProfilStore } from '@/stores/profilStore';
import { useAdresses } from '@/hooks/useAdresses';
import { AdresseSchema } from '@/lib/validation';
import { toast } from '@/lib/toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonMembresFoyer } from '@/components/ui/Skeleton';
import { ScreenScroll } from '@/components/ui/Screen';
import { DisplayLG, Body, BodySm, Caption } from '@/components/ui/Typography';
import { t } from '@/lib/i18n';
import type { AdresseLivraison } from '@/types';
import type { DonneesAdresse } from '@/lib/adressesRepository';

const ADRESSE_VIDE: DonneesAdresse = { libelle: '', rue: '', npa: '', ville: '', complement: '', estDefaut: false };

function ChampTexte({
  label,
  valeur,
  onChangeText,
  placeholder,
  clavierNumerique,
}: {
  label: string;
  valeur: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  clavierNumerique?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Caption>{label}</Caption>
      <TextInput
        value={valeur}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={clavierNumerique ? 'number-pad' : 'default'}
        accessibilityLabel={label}
        style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.textPrimary }}
      />
    </View>
  );
}

function AdresseFormulaire({
  initial,
  enregistrementEnCours,
  onAnnuler,
  onEnregistrer,
}: {
  initial: DonneesAdresse;
  enregistrementEnCours: boolean;
  onAnnuler: () => void;
  onEnregistrer: (donnees: DonneesAdresse) => void;
}) {
  const { colors } = useTheme();
  const [libelle, setLibelle] = useState(initial.libelle);
  const [rue, setRue] = useState(initial.rue);
  const [npa, setNpa] = useState(initial.npa);
  const [ville, setVille] = useState(initial.ville);
  const [complement, setComplement] = useState(initial.complement ?? '');
  const [estDefaut, setEstDefaut] = useState(initial.estDefaut);

  const valider = () => {
    const resultat = AdresseSchema.safeParse({ libelle, rue, npa, ville, complement: complement || undefined, estDefaut });
    if (!resultat.success) {
      toast.erreur(resultat.error.issues[0]?.message ?? t('adresses.erreur_generique'));
      return;
    }
    onEnregistrer(resultat.data);
  };

  return (
    <Card style={{ padding: 20, gap: 14, borderRadius: 28, borderTopLeftRadius: 28 }}>
      <ChampTexte label={t('adresses.libelle_label')} valeur={libelle} onChangeText={setLibelle} placeholder={t('adresses.libelle_placeholder')} />
      <ChampTexte label={t('adresses.rue_label')} valeur={rue} onChangeText={setRue} placeholder={t('adresses.rue_placeholder')} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <ChampTexte label={t('adresses.npa_label')} valeur={npa} onChangeText={setNpa} placeholder={t('adresses.npa_placeholder')} clavierNumerique />
        </View>
        <View style={{ flex: 2 }}>
          <ChampTexte label={t('adresses.ville_label')} valeur={ville} onChangeText={setVille} placeholder={t('adresses.ville_placeholder')} />
        </View>
      </View>
      <ChampTexte label={t('adresses.complement_label')} valeur={complement} onChangeText={setComplement} placeholder={t('adresses.complement_placeholder')} />

      <Pressable
        onPress={() => setEstDefaut((v) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: estDefaut }}
        accessibilityLabel={t('adresses.defaut_label')}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: estDefaut ? colors.primary : colors.border,
            backgroundColor: estDefaut ? colors.primary : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {estDefaut && <Star size={12} color="#FFFFFF" fill="#FFFFFF" />}
        </View>
        <BodySm>{t('adresses.defaut_label')}</BodySm>
      </Pressable>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button label={t('commun.annuler')} variant="secondary" onPress={onAnnuler} disabled={enregistrementEnCours} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label={t('adresses.enregistrer')} onPress={valider} loading={enregistrementEnCours} />
        </View>
      </View>
    </Card>
  );
}

function AdresseLigne({
  adresse,
  onModifier,
  onRetirer,
}: {
  adresse: AdresseLivraison;
  onModifier: () => void;
  onRetirer: () => void;
}) {
  const { colors } = useTheme();
  const [confirmationRetrait, setConfirmationRetrait] = useState(false);

  return (
    <Card style={{ padding: 16, gap: 10, borderRadius: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Body>{adresse.libelle}</Body>
            {adresse.estDefaut && <Star size={14} color={colors.primary} fill={colors.primary} />}
          </View>
          <Caption>{adresse.rue}</Caption>
          <Caption>{adresse.npa} {adresse.ville}</Caption>
          {adresse.complement && <Caption>{adresse.complement}</Caption>}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={onModifier} accessibilityRole="button" accessibilityLabel={t('adresses.modifier_label', { libelle: adresse.libelle })} hitSlop={8}>
            <Pencil size={18} color={colors.textMuted} />
          </Pressable>
          <Pressable onPress={() => setConfirmationRetrait(true)} accessibilityRole="button" accessibilityLabel={t('adresses.retirer_label', { libelle: adresse.libelle })} hitSlop={8}>
            <Trash2 size={18} color={colors.error} />
          </Pressable>
        </View>
      </View>

      {confirmationRetrait && (
        <View style={{ gap: 8 }}>
          <BodySm>{t('adresses.confirmer_retrait', { libelle: adresse.libelle })}</BodySm>
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

export default function Adresses() {
  const profil = useProfilStore((s) => s.profil);
  const { adresses, isLoading, isError, isEmpty, mutationEnCours, refetch, ajouter, modifier, retirer } = useAdresses(profil?.id);
  const [mode, setMode] = useState<'liste' | 'ajout' | { edition: AdresseLivraison }>('liste');

  const fermerFormulaire = () => setMode('liste');

  const enregistrer = async (donnees: DonneesAdresse) => {
    try {
      if (mode === 'ajout') {
        await ajouter(donnees);
        toast.succes(t('adresses.adresse_ajoutee'));
      } else if (typeof mode === 'object') {
        await modifier(mode.edition.id, donnees);
        toast.succes(t('adresses.adresse_modifiee'));
      }
      setMode('liste');
    } catch {
      toast.erreur(t('adresses.erreur_generique'));
    }
  };

  const retirerAdresse = async (adresseId: string) => {
    try {
      await retirer(adresseId);
      toast.succes(t('adresses.adresse_retiree'));
    } catch {
      toast.erreur(t('adresses.erreur_generique'));
    }
  };

  return (
    <ScreenScroll contentContainerStyle={{ gap: 18 }} tabBar={false}>
      <View>
        <DisplayLG>{t('adresses.titre')}</DisplayLG>
        <BodySm>{t('adresses.sous_titre')}</BodySm>
      </View>

      {isLoading ? (
        <SkeletonMembresFoyer />
      ) : isError ? (
        <EmptyState
          illustration="adresse"
          titre={t('adresses.erreur_titre')}
          sousTitre={t('adresses.erreur_soustitre')}
          ctaLabel={t('commun.reessayer')}
          onCta={() => refetch()}
        />
      ) : (
        <>
          {mode === 'ajout' && (
            <AdresseFormulaire initial={ADRESSE_VIDE} enregistrementEnCours={mutationEnCours} onAnnuler={fermerFormulaire} onEnregistrer={enregistrer} />
          )}
          {typeof mode === 'object' && (
            <AdresseFormulaire
              initial={{
                libelle: mode.edition.libelle,
                rue: mode.edition.rue,
                npa: mode.edition.npa,
                ville: mode.edition.ville,
                complement: mode.edition.complement ?? '',
                estDefaut: mode.edition.estDefaut,
              }}
              enregistrementEnCours={mutationEnCours}
              onAnnuler={fermerFormulaire}
              onEnregistrer={enregistrer}
            />
          )}

          {mode === 'liste' && isEmpty && (
            <EmptyState
              illustration="adresse"
              titre={t('adresses.vide_titre')}
              sousTitre={t('adresses.vide_soustitre')}
              ctaLabel={t('adresses.ajouter')}
              onCta={() => setMode('ajout')}
            />
          )}

          {mode === 'liste' && !isEmpty && (
            <View style={{ gap: 12 }}>
              {adresses.map((a) => (
                <AdresseLigne key={a.id} adresse={a} onModifier={() => setMode({ edition: a })} onRetirer={() => void retirerAdresse(a.id)} />
              ))}
            </View>
          )}

          {mode === 'liste' && !isEmpty && <Button label={t('adresses.ajouter')} onPress={() => setMode('ajout')} />}
        </>
      )}
    </ScreenScroll>
  );
}
