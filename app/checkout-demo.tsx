import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AlertTriangle, CalendarClock, Check, Clock3, Home, LifeBuoy, RotateCcw, Truck } from 'lucide-react-native';
import { router } from 'expo-router';
import { ScreenScroll } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Body, BodySm, Caption, DisplayLG, Heading, PriceLG, Subheading } from '@/components/ui/Typography';
import { useTheme } from '@/lib/theme-context';
import { useProfilStore } from '@/stores/profilStore';
import { usePanierLiveStore, totalProduits } from '@/stores/panierLiveStore';
import { useAdresses } from '@/hooks/useAdresses';
import { genererCreneauxLivraisonDemo, genererLivraisonsDemo } from '@/lib/livraisonsDemo';
import { enregistrerCommandeDemo } from '@/lib/commandesDemoRepository';
import { formatPrix } from '@/lib/format';
import { t } from '@/lib/i18n';
import { usePreferencesCourses } from '@/hooks/usePreferencesCourses';
import { PREFERENCES_COURSES_DEFAUT } from '@/lib/preferencesCoursesRepository';
import { orchestrerCommandeDemo } from '@/lib/orchestrateurCommandeDemo';
import { evaluerFraicheurPrix } from '@/lib/fiabilitePrix';
import type { Enseigne } from '@/types';
import { reconcilierPanier } from '@/lib/reconciliationPanier';
import { ResumeCheckoutMultiEnseignes } from '@/components/courses/ResumeCheckoutMultiEnseignes';
import { preparerPaiementUniqueDemo } from '@/lib/paiementUniqueDemo';
import type { EtatOrchestrationEnseigne } from '@/lib/orchestrateurCommandeDemo';
import { Badge } from '@/components/ui/Badge';
import { evaluerExpirationCheckout } from '@/lib/expirationCheckout';
import { creerDiagnosticCheckout, determinerActionRepriseCheckout } from '@/lib/diagnosticCheckout';

function formaterCreneau(debut: string, fin: string): string {
  const dateDebut = new Date(debut);
  const dateFin = new Date(fin);
  const jour = new Intl.DateTimeFormat('fr-CH', { weekday: 'short', day: 'numeric', month: 'short' }).format(
    dateDebut,
  );
  const heure = (date: Date) =>
    new Intl.DateTimeFormat('fr-CH', { hour: '2-digit', minute: '2-digit' }).format(date);
  return `${jour} · ${heure(dateDebut)}–${heure(dateFin)}`;
}

export default function CheckoutDemo() {
  const { colors } = useTheme();
  const profil = useProfilStore((state) => state.profil);
  const brouillon = usePanierLiveStore((state) => state.brouillon);
  const definirAdresse = usePanierLiveStore((state) => state.definirAdresse);
  const definirLivraisons = usePanierLiveStore((state) => state.definirLivraisons);
  const definirPaiementEnCours = usePanierLiveStore((state) => state.definirPaiementEnCours);
  const demarrerTentativeCheckout = usePanierLiveStore((state) => state.demarrerTentativeCheckout);
  const terminerTentativeCheckout = usePanierLiveStore((state) => state.terminerTentativeCheckout);
  const { adresses, isLoading, isError, refetch } = useAdresses(profil?.id);
  const preferencesQuery = usePreferencesCourses(profil?.id);
  const [erreur, setErreur] = useState<string | null>(null);
  const [prixAnciensConfirmes, setPrixAnciensConfirmes] = useState(false);
  const [selectionCreneaux, setSelectionCreneaux] = useState<Partial<Record<Enseigne, string>>>({});
  const [referenceCreneaux] = useState(() => new Date());
  const [etatsOrchestration, setEtatsOrchestration] = useState<EtatOrchestrationEnseigne[]>([]);
  const [expirationDetectee, setExpirationDetectee] = useState(false);

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
  const livraisons = genererLivraisonsDemo(
    brouillon,
    selectionCreneaux,
    preferencesQuery.data?.creneauPrefere,
    referenceCreneaux,
  );
  const fraisLivraison = livraisons.reduce((total, livraison) => total + livraison.prix, 0);
  const montantTotal = totalProduits(brouillon) + fraisLivraison;
  const prixAnciens = evaluerFraicheurPrix(brouillon.collecteLe).statut === 'ancien';
  const reconciliation = reconcilierPanier(brouillon);
  const sessionExpiree =
    expirationDetectee || evaluerExpirationCheckout(brouillon.creeLe, referenceCreneaux).expiree;
  const repriseNecessaire = etatsOrchestration.some((etat) => etat.statut !== 'pret');
  const tentativeInterrompue =
    brouillon.tentativeCheckout?.statut === 'en_cours' && !brouillon.paiementEnCours;
  const tentativeEnEchec = brouillon.tentativeCheckout?.statut === 'echec';
  const repriseVisible = repriseNecessaire || tentativeInterrompue || tentativeEnEchec;
  const actionReprise = tentativeInterrompue
    ? 'relancer'
    : determinerActionRepriseCheckout(etatsOrchestration);

  const simulerPaiement = async () => {
    if (evaluerExpirationCheckout(brouillon.creeLe).expiree) {
      setExpirationDetectee(true);
      setErreur(null);
      return;
    }
    if (!reconciliation.estPret) {
      setErreur(t('checkout.reconciliation_bloque_checkout'));
      return;
    }
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
    demarrerTentativeCheckout();
    setErreur(null);
    setEtatsOrchestration([]);
    try {
      const preferences = preferencesQuery.data ?? PREFERENCES_COURSES_DEFAUT;
      const orchestration = await orchestrerCommandeDemo(
        { ...brouillon, adresseId: adresseSelectionnee.id, livraisons },
        livraisons,
        preferences,
      );
      setEtatsOrchestration(orchestration.etats);
      if (orchestration.echecs.length > 0) {
        const diagnostic = creerDiagnosticCheckout(orchestration.etats);
        terminerTentativeCheckout('echec', diagnostic.reference);
        setErreur(t('checkout.simulation_marchand_erreur'));
        definirPaiementEnCours(false);
        return;
      }
      const paiement = preparerPaiementUniqueDemo(orchestration.confirmations, brouillon.id);
      const confirmation = await enregistrerCommandeDemo({
        profilId: profil.id,
        brouillon: { ...brouillon, adresseId: adresseSelectionnee.id, livraisons },
        adresse: adresseSelectionnee,
        livraisons,
        confirmations: orchestration.confirmations,
        paiement,
      });
      terminerTentativeCheckout('terminee');
      router.replace({
        pathname: '/commande-demo',
        params: {
          commandeId: confirmation.id,
          reference: confirmation.reference,
          montant: confirmation.montantTotal.toFixed(2),
        },
      });
    } catch {
      const diagnostic = creerDiagnosticCheckout([]);
      terminerTentativeCheckout('echec', diagnostic.reference);
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

      {!reconciliation.estPret ? (
        <Card style={{ padding: 16, gap: 10 }}>
          <BodySm accessibilityRole="alert" style={{ color: colors.error }}>
            {t('checkout.reconciliation_bloque_checkout')}
          </BodySm>
          <Button
            variant="secondary"
            label={t('checkout.revenir_corriger_panier')}
            onPress={() => router.replace('/panier-en-ligne')}
          />
        </Card>
      ) : null}

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

      <ResumeCheckoutMultiEnseignes brouillon={brouillon} livraisons={livraisons} />

      {etatsOrchestration.length > 0 ? (
        <View accessibilityLiveRegion="polite" style={{ gap: 8 }}>
          <Heading>{t('checkout.synchronisation_titre')}</Heading>
          {etatsOrchestration.map((etat) => (
            <Card key={etat.enseigne} style={{ padding: 14, flexDirection: 'row', gap: 10 }}>
              <BodySm style={{ flex: 1 }}>{t(`checkout.enseigne_${etat.enseigne}`)}</BodySm>
              <Badge
                label={t(`checkout.statut_${etat.statut}`)}
                variant={etat.statut === 'pret' ? 'success' : 'warning'}
              />
            </Card>
          ))}
        </View>
      ) : null}

      {repriseVisible ? (
        <Card
          accessibilityRole="alert"
          style={{ padding: 16, gap: 12, backgroundColor: colors.warningBg }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <RotateCcw size={20} color={colors.chipTextWarning} accessible={false} />
            <Heading style={{ flex: 1, color: colors.chipTextWarning }}>
              {t(tentativeInterrompue ? 'checkout.interruption_titre' : 'checkout.reprise_titre')}
            </Heading>
          </View>
          <BodySm style={{ color: colors.chipTextWarning }}>
            {t(
              tentativeInterrompue
                ? 'checkout.interruption_aide'
                : actionReprise === 'corriger_panier'
                  ? 'checkout.reprise_corriger_aide'
                  : 'checkout.reprise_aide',
            )}
          </BodySm>
          {brouillon.tentativeCheckout?.referenceIncident ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <LifeBuoy size={18} color={colors.chipTextWarning} accessible={false} />
              <Caption selectable style={{ color: colors.chipTextWarning, fontVariant: ['tabular-nums'] }}>
                {t('checkout.reference_incident', {
                  reference: brouillon.tentativeCheckout.referenceIncident,
                })}
              </Caption>
            </View>
          ) : null}
        </Card>
      ) : null}

      {sessionExpiree ? (
        <Card
          accessibilityRole="alert"
          style={{ padding: 16, gap: 12, backgroundColor: colors.warningBg }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Clock3 size={20} color={colors.chipTextWarning} accessible={false} />
            <Heading style={{ flex: 1, color: colors.chipTextWarning }}>
              {t('checkout.session_expiree_titre')}
            </Heading>
          </View>
          <BodySm style={{ color: colors.chipTextWarning }}>
            {t('checkout.session_expiree_aide')}
          </BodySm>
          <Button
            variant="secondary"
            label={t('checkout.actualiser_paniers')}
            onPress={() => router.replace('/panier-en-ligne')}
          />
        </Card>
      ) : null}

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
          <Card key={livraison.id} style={{ padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Truck size={20} color={colors.primary} accessible={false} />
              <View style={{ flex: 1 }}>
                <Subheading>{t(`checkout.enseigne_${livraison.enseigne}`)}</Subheading>
                <Caption>{t('checkout.livraison_standard_demo')}</Caption>
              </View>
              <BodySm style={{ fontVariant: ['tabular-nums'] }}>
                {livraison.prix === 0 ? t('checkout.gratuit') : formatPrix(livraison.prix)}
              </BodySm>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CalendarClock size={18} color={colors.primary} accessible={false} />
              <BodySm style={{ fontWeight: '700' }}>{t('checkout.choisir_creneau')}</BodySm>
            </View>
            <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
              {genererCreneauxLivraisonDemo(livraison.enseigne, referenceCreneaux).map((creneau) => {
                const selectionne = livraison.creneau?.id === creneau.id;
                return (
                  <Pressable
                    key={creneau.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selectionne }}
                    onPress={() =>
                      setSelectionCreneaux((actuel) => ({
                        ...actuel,
                        [livraison.enseigne]: creneau.id,
                      }))
                    }
                    style={{
                      minHeight: 48,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: selectionne ? colors.primary : colors.border,
                      backgroundColor: selectionne ? colors.bgSecondary : colors.bgCard,
                      paddingHorizontal: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <BodySm style={{ flex: 1 }}>{formaterCreneau(creneau.debut, creneau.fin)}</BodySm>
                    {selectionne ? <Check size={18} color={colors.primary} accessible={false} /> : null}
                  </Pressable>
                );
              })}
            </View>
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

      {erreur && !repriseVisible ? (
        <BodySm accessibilityRole="alert" style={{ color: colors.error }}>
          {erreur}
        </BodySm>
      ) : null}

      <Button
        label={
          repriseVisible
            ? t(
                actionReprise === 'corriger_panier'
                  ? 'checkout.revenir_corriger_panier'
                  : 'checkout.relancer_simulation',
              )
            : prixAnciens && prixAnciensConfirmes
            ? t('checkout.continuer_prix_anciens')
            : t('checkout.executer_simulation', { montant: formatPrix(montantTotal) })
        }
        onPress={() =>
          actionReprise === 'corriger_panier' && repriseVisible
            ? router.replace('/panier-en-ligne')
            : void simulerPaiement()
        }
        loading={brouillon.paiementEnCours}
        disabled={
          sessionExpiree ||
          (!reconciliation.estPret && !(repriseVisible && actionReprise === 'corriger_panier'))
        }
        accessibilityHint={t(
          actionReprise === 'corriger_panier' && repriseVisible
            ? 'checkout.revenir_corriger_panier_hint'
            : 'checkout.executer_simulation_hint',
        )}
      />
    </ScreenScroll>
  );
}
