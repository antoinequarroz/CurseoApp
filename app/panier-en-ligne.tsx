import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Minus,
  Plus,
  ShoppingBasket,
  Trash2,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { ScreenScroll } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Body, BodySm, Caption, DisplayLG, Heading, Price, Subheading } from '@/components/ui/Typography';
import { useTheme } from '@/lib/theme-context';
import { formatPrix } from '@/lib/format';
import { dates } from '@/lib/dates';
import { evaluerFraicheurPrix } from '@/lib/fiabilitePrix';
import { rafraichirPrixPanier } from '@/lib/rafraichissementPanier';
import { usePreferencesCourses } from '@/hooks/usePreferencesCourses';
import { useProfilStore } from '@/stores/profilStore';
import { t } from '@/lib/i18n';
import { sousTotalPanier, totalProduits, usePanierLiveStore } from '@/stores/panierLiveStore';
import { reconcilierPanier } from '@/lib/reconciliationPanier';

const NOMS_ENSEIGNES: Record<string, string> = {
  migros: 'Migros',
  coop: 'Coop',
  aldi: 'Aldi',
  lidl: 'Lidl',
  ottos: "Otto's",
};

function BoutonIcone({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bgSecondary,
      }}
    >
      {children}
    </Pressable>
  );
}

export default function PanierEnLigne() {
  const { colors } = useTheme();
  const brouillon = usePanierLiveStore((state) => state.brouillon);
  const definirQuantite = usePanierLiveStore((state) => state.definirQuantite);
  const retirerArticle = usePanierLiveStore((state) => state.retirerArticle);
  const appliquerRafraichissement = usePanierLiveStore((state) => state.appliquerRafraichissement);
  const validerCorrespondance = usePanierLiveStore((state) => state.validerCorrespondance);
  const profil = useProfilStore((state) => state.profil);
  const preferences = usePreferencesCourses(profil?.id);
  const [rafraichissement, setRafraichissement] = useState(false);
  const [erreurRafraichissement, setErreurRafraichissement] = useState(false);

  if (!brouillon || brouillon.paniers.length === 0) {
    return (
      <ScreenScroll tabBar={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: 18 }}>
        <EmptyState
          illustration="courses"
          titre={t('checkout.panier_vide_titre')}
          sousTitre={t('checkout.panier_vide_description')}
        />
        <Button label={t('checkout.retour_courses')} onPress={() => router.replace('/(tabs)/courses')} />
      </ScreenScroll>
    );
  }

  const fraicheur = evaluerFraicheurPrix(brouillon.collecteLe);
  const reconciliation = reconcilierPanier(brouillon);
  const actualiser = async () => {
    setRafraichissement(true);
    setErreurRafraichissement(false);
    try {
      const lignes = brouillon.paniers.flatMap((panier) => panier.articles);
      const resultat = await rafraichirPrixPanier(lignes, preferences.data);
      appliquerRafraichissement(resultat.resultats, resultat.collecteLe);
    } catch {
      setErreurRafraichissement(true);
    } finally {
      setRafraichissement(false);
    }
  };

  return (
    <ScreenScroll tabBar={false} contentContainerStyle={{ gap: 20 }}>
      <View style={{ gap: 5 }}>
        <DisplayLG>{t('checkout.paniers_titre')}</DisplayLG>
        <Body>{t('checkout.paniers_description')}</Body>
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
        <BodySm style={{ flex: 1, color: colors.chipTextWarning }}>{t('checkout.demo_avertissement')}</BodySm>
      </View>

      <Card style={{ padding: 16, gap: 10 }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}
        >
          <Badge
            label={t(`checkout.fraicheur_${fraicheur.statut}`)}
            variant={
              fraicheur.statut === 'frais' ? 'success' : fraicheur.statut === 'ancien' ? 'error' : 'warning'
            }
          />
          <Button
            variant="ghost"
            label={t('checkout.actualiser_prix')}
            loading={rafraichissement}
            onPress={() => void actualiser()}
          />
        </View>
        <Caption>
          {t('checkout.prix_interroges', {
            date: dates.formatDateHeureCourte(new Date(brouillon.collecteLe)),
          })}
        </Caption>
        <Caption>{t('checkout.disponibilite_non_confirmee')}</Caption>
        {erreurRafraichissement ? (
          <BodySm accessibilityRole="alert" style={{ color: colors.error }}>
            {t('checkout.actualisation_erreur')}
          </BodySm>
        ) : null}
      </Card>

      <Card style={{ padding: 18, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {reconciliation.estPret ? (
            <CheckCircle2 size={21} color={colors.success} accessible={false} />
          ) : (
            <AlertCircle size={21} color={colors.error} accessible={false} />
          )}
          <View style={{ flex: 1 }}>
            <Heading>
              {reconciliation.estPret
                ? t('checkout.reconciliation_prete')
                : t('checkout.reconciliation_a_corriger')}
            </Heading>
            <Caption>
              {t('checkout.reconciliation_resume', {
                bloquants: reconciliation.bloquants.length,
                attentions: reconciliation.attentions.length,
              })}
            </Caption>
          </View>
        </View>
        {reconciliation.problemes.map((probleme) => (
          <View
            key={probleme.id}
            style={{
              gap: 8,
              padding: 12,
              borderRadius: 14,
              backgroundColor: probleme.severite === 'bloquant' ? colors.swipePass : colors.warningBg,
            }}
          >
            <BodySm>{t(`checkout.reconciliation_${probleme.code}`, { produit: probleme.produit })}</BodySm>
            {probleme.code === 'correspondance_a_valider' && probleme.ligneId ? (
              <Button
                variant="secondary"
                label={t('checkout.valider_correspondance')}
                onPress={() => validerCorrespondance(probleme.ligneId!)}
              />
            ) : null}
          </View>
        ))}
      </Card>

      {brouillon.paniers.map((panier) => (
        <Card key={panier.enseigne} style={{ padding: 18, gap: 14 }}>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <ShoppingBasket size={21} color={colors.primary} accessible={false} />
              <View style={{ flex: 1 }}>
                <Heading>{NOMS_ENSEIGNES[panier.enseigne] ?? panier.enseigne}</Heading>
                {panier.magasin ? <Caption>{panier.magasin}</Caption> : null}
              </View>
            </View>
            <Price>{formatPrix(sousTotalPanier(panier))}</Price>
          </View>

          {panier.articles.map((article) => (
            <View
              key={article.id}
              style={{ gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <BodySm style={{ fontWeight: '700' }}>{article.produit}</BodySm>
                  <Caption>
                    {[article.marque, article.format].filter(Boolean).join(' · ') || article.demande}
                  </Caption>
                  {article.besoinQuantite != null ? (
                    <Caption>
                      {t('checkout.besoin_paquets', {
                        quantite: article.besoinQuantite,
                        unite: article.besoinUnite ?? '',
                        count: article.nombrePaquets ?? article.quantite,
                      })}
                    </Caption>
                  ) : null}
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    <Badge
                      label={t(`checkout.pertinence_${article.pertinence ?? 'moyenne'}`)}
                      variant={article.validationRequise ? 'warning' : 'neutral'}
                    />
                    <Badge
                      label={
                        article.disponibilite === 'resultat_catalogue'
                          ? t('checkout.resultat_catalogue')
                          : t('checkout.disponibilite_non_confirmee')
                      }
                      variant="neutral"
                    />
                  </View>
                </View>
                <BodySm style={{ fontVariant: ['tabular-nums'] }}>
                  {formatPrix(article.prixUnitaire * article.quantite)}
                </BodySm>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <BoutonIcone
                  label={t('checkout.diminuer_quantite', { produit: article.produit })}
                  onPress={() => definirQuantite(article.id, article.quantite - 1)}
                >
                  <Minus size={18} color={colors.primary} accessible={false} />
                </BoutonIcone>
                <BodySm
                  accessibilityLabel={t('checkout.quantite_accessible', { count: article.quantite })}
                  style={{
                    minWidth: 28,
                    textAlign: 'center',
                    fontVariant: ['tabular-nums'],
                    fontWeight: '700',
                  }}
                >
                  {article.quantite}
                </BodySm>
                <BoutonIcone
                  label={t('checkout.augmenter_quantite', { produit: article.produit })}
                  onPress={() => definirQuantite(article.id, article.quantite + 1)}
                >
                  <Plus size={18} color={colors.primary} accessible={false} />
                </BoutonIcone>
                <View style={{ flex: 1 }} />
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/remplacer-produit',
                      params: { ligneId: article.id, demande: article.demande },
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={t('checkout.remplacer_produit', { produit: article.produit })}
                  style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 }}
                >
                  <BodySm style={{ color: colors.primary, fontWeight: '700' }}>
                    {t('checkout.changer')}
                  </BodySm>
                </Pressable>
                <BoutonIcone
                  label={t('checkout.retirer_produit', { produit: article.produit })}
                  onPress={() => retirerArticle(article.id)}
                >
                  <Trash2 size={18} color={colors.error} accessible={false} />
                </BoutonIcone>
              </View>
            </View>
          ))}
        </Card>
      ))}

      {brouillon.articlesNonTrouves.length > 0 ? (
        <Card style={{ padding: 16, gap: 6 }}>
          <Badge label={t('checkout.a_choisir_sur_place')} variant="warning" />
          <BodySm>{brouillon.articlesNonTrouves.join(', ')}</BodySm>
        </Card>
      ) : null}

      <Card style={{ padding: 18, gap: 6 }} accessibilityRole="summary">
        <Caption>{t('checkout.total_produits')}</Caption>
        <Subheading style={{ fontVariant: ['tabular-nums'] }}>
          {formatPrix(totalProduits(brouillon))}
        </Subheading>
        <Caption>{t('checkout.livraison_ajoutee_apres')}</Caption>
      </Card>

      <Button
        label={
          reconciliation.estPret ? t('checkout.choisir_livraison') : t('checkout.corriger_avant_livraison')
        }
        disabled={!reconciliation.estPret}
        onPress={() => router.push('/checkout-demo')}
      />
    </ScreenScroll>
  );
}
