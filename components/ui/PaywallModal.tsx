/** Paywall elegant — s'ouvre uniquement au tap sur une feature premium, dismissal facile. */
import React from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { useTheme } from '@/lib/theme-context';
import { useHaptics } from '@/hooks/useHaptics';
import { t } from '@/lib/i18n';
import { PALIERS_ABONNEMENT, fetchOffreCourante, acheterPackage } from '@/lib/revenuecat';
import { useProfilStore } from '@/stores/profilStore';
import { toast } from '@/lib/toast';
import { analytics } from '@/lib/analytics';
import { Body, BodySm, Heading, DisplayLG } from './Typography';
import { Button } from './Button';
import type { NiveauAbonnement } from '@/types';
import type { PurchasesPackage } from 'react-native-purchases';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onChoisir: (palier: NiveauAbonnement) => void;
  featureOrigine?: string;
}

const PALIER_DEFAUT: NiveauAbonnement = 'standard';

/** COUR-32 : convention de nommage produit proposee dans docs/entitlements/matrice-droits.md. */
function trouverPackage(offres: PurchasesPackage[], palierId: NiveauAbonnement): PurchasesPackage | undefined {
  return offres.find((pkg) => pkg.product.identifier.startsWith(`coursia_${palierId}`));
}

export function PaywallModal({ visible, onClose, onChoisir, featureOrigine }: PaywallModalProps) {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const [palierSelectionne, setPalierSelectionne] = React.useState<NiveauAbonnement>(PALIER_DEFAUT);
  const [offres, setOffres] = React.useState<PurchasesPackage[]>([]);
  const [achatEnCours, setAchatEnCours] = React.useState(false);
  // Reinitialise la selection a chaque reouverture — ajustement pendant le
  // rendu (pattern recommande par React) plutot qu'un setState dans un effet.
  const [visiblePrecedent, setVisiblePrecedent] = React.useState(visible);
  if (visible !== visiblePrecedent) {
    setVisiblePrecedent(visible);
    if (visible) setPalierSelectionne(PALIER_DEFAUT);
  }

  React.useEffect(() => {
    if (visible) {
      void haptics.medium();
      analytics.paywallShown(featureOrigine ?? 'inconnue');
    }
  }, [visible, featureOrigine, haptics]);

  // COUR-32 critere 1 : prix/periode reels du store quand des produits sont
  // configures dans RevenueCat — [] sinon (mode demo, ou paliers pas encore
  // crees sur les plateformes), auquel cas le prix marketing statique de
  // PALIERS_ABONNEMENT reste affiche. Effet separe de celui ci-dessus : ni
  // fetchOffreCourante ni setOffres ne changent de reference, seul `visible`
  // doit declencher un nouveau fetch (haptics/analytics n'ont pas a le faire).
  React.useEffect(() => {
    if (!visible) return;
    void fetchOffreCourante().then(setOffres);
  }, [visible]);

  const confirmer = async () => {
    const pkg = trouverPackage(offres, palierSelectionne);
    if (!pkg) {
      // Pas de produit reel configure pour ce palier (mode demo/dev, ou
      // palier Gratuit qui n'a pas d'achat) — comportement historique.
      onChoisir(palierSelectionne);
      return;
    }
    setAchatEnCours(true);
    try {
      const resultat = await acheterPackage(pkg);
      // Annulation utilisateur (fenetre native fermee) : jamais une erreur,
      // ne bloque rien — l'utilisateur reste sur le paywall (critere 5).
      if (resultat.annule) return;
      if (resultat.niveau) useProfilStore.getState().refleterAbonnementLocal(resultat.niveau);
      void haptics.success();
      toast.succes(t('paywall.achat_reussi'));
      onChoisir(resultat.niveau ?? palierSelectionne);
    } catch (error) {
      console.warn('[paywall] Echec achat', error);
      toast.erreur(t('paywall.achat_echec'));
    } finally {
      setAchatEnCours(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <View style={{ backgroundColor: colors.bgElevated, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 }}>
            <DisplayLG>{t('paywall.titre')}</DisplayLG>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('commun.fermer')}
              hitSlop={8}
            >
              <X size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
            {PALIERS_ABONNEMENT.map((palier) => {
              // COUR-32 critere 1 : prix/periode reels du store des qu'un
              // produit est configure pour ce palier, sinon repli sur le
              // texte marketing statique.
              const prixAffiche = trouverPackage(offres, palier.id)?.product.priceString ?? palier.prix;
              return (
              <Pressable
                key={palier.id}
                onPress={() => {
                  void haptics.selection();
                  setPalierSelectionne(palier.id);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: palierSelectionne === palier.id }}
                accessibilityLabel={t('paywall.choisir_palier_label', { nom: palier.nom, prix: prixAffiche })}
                style={{
                  borderRadius: 16,
                  borderWidth: palierSelectionne === palier.id ? 2 : 1,
                  borderColor: palierSelectionne === palier.id ? colors.primary : colors.border,
                  padding: 16,
                  gap: 8,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Heading>{palier.nom}</Heading>
                  <Body style={{ color: colors.primary, fontWeight: '600' }}>{prixAffiche}</Body>
                </View>
                {palier.fonctionnalites.map((f) => (
                  <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Check size={14} color={colors.success} />
                    <BodySm>{f}</BodySm>
                  </View>
                ))}
              </Pressable>
              );
            })}
          </ScrollView>

          <View style={{ padding: 20 }}>
            <Button label={t('paywall.continuer')} loading={achatEnCours} onPress={() => void confirmer()} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
