import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AlertTriangle, Check, Home, Truck } from 'lucide-react-native';
import { router } from 'expo-router';
import { ScreenScroll } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Body, BodySm, Caption, DisplayLG, Heading, PriceLG, Subheading } from '@/components/ui/Typography';
import { useTheme } from '@/lib/theme-context';
import { useProfilStore } from '@/stores/profilStore';
import { usePanierLiveStore, totalProduits } from '@/stores/panierLiveStore';
import { useAdresses } from '@/hooks/useAdresses';
import { genererLivraisonsDemo } from '@/lib/livraisonsDemo';
import { enregistrerCommandeDemo } from '@/lib/commandesDemoRepository';
import { formatPrix } from '@/lib/format';
import { t } from '@/lib/i18n';
import { usePreferencesCourses } from '@/hooks/usePreferencesCourses';
import { PREFERENCES_COURSES_DEFAUT } from '@/lib/preferencesCoursesRepository';
import { orchestrerCommandeDemo } from '@/lib/orchestrateurCommandeDemo';
import { evaluerFraicheurPrix } from '@/lib/fiabilitePrix';

export default function CheckoutDemo() {
  const { colors } = useTheme();
  const profil = useProfilStore((state) => state.profil);
  const brouillon = usePanierLiveStore((state) => state.brouillon);
  const definirAdresse = usePanierLiveStore((state) => state.definirAdresse);
  const definirLivraisons = usePanierLiveStore((state) => state.definirLivraisons);
  const definirPaiementEnCours = usePanierLiveStore((state) => state.definirPaiementEnCours);
  const { adresses, isLoading, isError, refetch } = useAdresses(profil?.id);
  const preferencesQuery = usePreferencesCourses(profil?.id);
  const [erreur, setErreur] = useState<string | null>(null);
  const [prixAnciensConfirmes, setPrixAnciensConfirmes] = useState(false);

  if (!profil || !brouillon) {
    return (
      <ScreenScroll tabBar={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: 18 }}>
        <Body>{t('checkout.session_requise')}</Body>
        <Button label={t('checkout.retour_courses')} onPress={() => router.replace('/(tabs)/courses')} />
      </ScreenScroll>
    );
  }

  const adresseSelectionnee =
    adresses.find((adresse) => adresse.id === brouillon.adresseId) ??
    adresses.find((adresse) => adresse.estDefaut) ??
    null;
  const livraisons = genererLivraisonsDemo(brouillon);
  const fraisLivraison = livraisons.reduce((total, livraison) => total + livraison.prix, 0);
  const montantTotal = totalProduits(brouillon) + fraisLivraison;
  const prixAnciens = evaluerFraicheurPrix(brouillon.collecteLe).statut === 'ancien';

  const simulerPaiement = async () => {
    if (!adresseSelectionnee) {
      setErreur(t('checkout.choisir_adresse_erreur'));
      return;
    }
    if (prixAnciens && !prixAnciensConfirmes) {
      setPrixAnciensConfirmes(true);
      setErreur(t('checkout.confirmer_prix_anciens'));
      return;
    }
    if (brouillon.paiementEnCours) return;
    definirAdresse(adresseSelectionnee.id);
    definirLivraisons(livraisons);
    definirPaiementEnCours(true);
    setErreur(null);
    try {
      const preferences = preferencesQuery.data ?? PREFERENCES_COURSES_DEFAUT;
      const orchestration = orchestrerCommandeDemo(
        { ...brouillon, adresseId: adresseSelectionnee.id, livraisons },
        livraisons,
        preferences,
      );
      if (orchestration.echecs.length > 0) {
        setErreur(t('checkout.simulation_marchand_erreur'));
        definirPaiementEnCours(false);
        return;
      }
      const confirmation = await enregistrerCommandeDemo({
        profilId: profil.id,
        brouillon: { ...brouillon, adresseId: adresseSelectionnee.id, livraisons },
        adresse: adresseSelectionnee,
        livraisons,
        confirmations: orchestration.confirmations,
      });
      router.replace({
        pathname: '/commande-demo',
        params: {
          commandeId: confirmation.id,
          reference: confirmation.reference,
          montant: confirmation.montantTotal.toFixed(2),
        },
      });
    } catch {
      setErreur(t('checkout.paiement_demo_erreur'));
      definirPaiementEnCours(false);
    }
  };

  return (
    <ScreenScroll tabBar={false} contentContainerStyle={{ gap: 20 }}>
      <View style={{ gap: 5 }}>
        <DisplayLG>{t('checkout.titre')}</DisplayLG>
        <Body>{t('checkout.description')}</Body>
      </View>

      <View
        accessibilityRole="alert"
        style={{
          flexDirection: 'row',
          gap: 10,
          padding: 14,
          borderRadius: 16,
          backgroundColor: colors.warningBg,
        }}
      >
        <AlertTriangle size={20} color={colors.chipTextWarning} accessible={false} />
        <BodySm style={{ flex: 1, color: colors.chipTextWarning }}>{t('checkout.aucun_debit')}</BodySm>
      </View>

      <View style={{ gap: 10 }}>
        <Heading>{t('checkout.adresse_titre')}</Heading>
        {isLoading ? <Caption>{t('commun.chargement')}</Caption> : null}
        {isError ? (
          <Card style={{ padding: 16, gap: 10 }}>
            <BodySm>{t('checkout.adresses_erreur')}</BodySm>
            <Button variant="secondary" label={t('commun.reessayer')} onPress={() => void refetch()} />
          </Card>
        ) : null}
        {!isLoading && !isError && adresses.length === 0 ? (
          <Card style={{ padding: 16, gap: 12 }}>
            <BodySm>{t('checkout.adresse_vide')}</BodySm>
            <Button
              variant="secondary"
              label={t('checkout.ajouter_adresse')}
              onPress={() => router.push('/adresses')}
            />
          </Card>
        ) : null}
        {adresses.map((adresse) => {
          const selectionnee = adresse.id === adresseSelectionnee?.id;
          return (
            <Pressable
              key={adresse.id}
              onPress={() => {
                definirAdresse(adresse.id);
                setErreur(null);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: selectionnee }}
              accessibilityLabel={`${adresse.libelle}, ${adresse.rue}, ${adresse.npa} ${adresse.ville}`}
              style={{
                minHeight: 72,
                padding: 16,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: selectionnee ? colors.primary : colors.border,
                backgroundColor: selectionnee ? colors.bgSecondary : colors.bgCard,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Home size={20} color={colors.primary} accessible={false} />
              <View style={{ flex: 1 }}>
                <Subheading>{adresse.libelle}</Subheading>
                <Caption>
                  {adresse.rue} · {adresse.npa} {adresse.ville}
                </Caption>
              </View>
              {selectionnee ? <Check size={20} color={colors.primary} accessible={false} /> : null}
            </Pressable>
          );
        })}
      </View>

      {preferencesQuery.data ? (
        <Card style={{ padding: 16, gap: 6 }}>
          <Heading>{t('checkout.preferences_resume')}</Heading>
          <BodySm>{t(`preferences_courses.creneau_option.${preferencesQuery.data.creneauPrefere}`)}</BodySm>
          <Caption>
            {preferencesQuery.data.livraisonSansContact
              ? t('preferences_courses.sans_contact_actif')
              : t('preferences_courses.sans_contact_inactif')}
          </Caption>
          <Caption>{t('preferences_courses.non_transmises')}</Caption>
        </Card>
      ) : null}

      {fraisLivraison > (preferencesQuery.data?.fraisLivraisonMax ?? Infinity) ? (
        <BodySm accessibilityRole="alert" style={{ color: colors.error }}>
          {t('checkout.frais_depasse_preferences')}
        </BodySm>
      ) : null}

      {prixAnciens ? (
        <View
          accessibilityRole="alert"
          style={{ padding: 14, borderRadius: 16, backgroundColor: colors.warningBg, gap: 4 }}
        >
          <BodySm style={{ color: colors.chipTextWarning }}>{t('checkout.prix_anciens_titre')}</BodySm>
          <Caption style={{ color: colors.chipTextWarning }}>{t('checkout.prix_anciens_aide')}</Caption>
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        <Heading>{t('checkout.livraison_titre')}</Heading>
        {livraisons.map((livraison) => (
          <Card
            key={livraison.id}
            style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <Truck size={20} color={colors.primary} accessible={false} />
            <View style={{ flex: 1 }}>
              <Subheading>{t(`checkout.enseigne_${livraison.enseigne}`)}</Subheading>
              <Caption>{t('checkout.livraison_standard_demo')}</Caption>
            </View>
            <BodySm style={{ fontVariant: ['tabular-nums'] }}>
              {livraison.prix === 0 ? t('checkout.gratuit') : formatPrix(livraison.prix)}
            </BodySm>
          </Card>
        ))}
      </View>

      <Card style={{ padding: 18, gap: 8 }} accessibilityRole="summary">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <BodySm>{t('checkout.total_produits')}</BodySm>
          <BodySm>{formatPrix(totalProduits(brouillon))}</BodySm>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          <BodySm>{t('checkout.frais_livraison')}</BodySm>
          <BodySm>{formatPrix(fraisLivraison)}</BodySm>
        </View>
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <Caption>{t('checkout.total_demo')}</Caption>
        <PriceLG>{formatPrix(montantTotal)}</PriceLG>
      </Card>

      {erreur ? (
        <BodySm accessibilityRole="alert" style={{ color: colors.error }}>
          {erreur}
        </BodySm>
      ) : null}

      <Button
        label={
          prixAnciens && prixAnciensConfirmes
            ? t('checkout.continuer_prix_anciens')
            : t('checkout.executer_simulation', { montant: formatPrix(montantTotal) })
        }
        onPress={() => void simulerPaiement()}
        loading={brouillon.paiementEnCours}
        accessibilityHint={t('checkout.executer_simulation_hint')}
      />
    </ScreenScroll>
  );
}
