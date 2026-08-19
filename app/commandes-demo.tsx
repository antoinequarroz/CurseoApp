import React from 'react';
import { Pressable, View } from 'react-native';
import { Clock3, ShoppingBag } from 'lucide-react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ScreenScroll } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Body, BodySm, Caption, DisplayLG, Price } from '@/components/ui/Typography';
import { useTheme } from '@/lib/theme-context';
import { useProfilStore } from '@/stores/profilStore';
import { fetchCommandesDemo } from '@/lib/commandesDemoRepository';
import { usePanierLiveStore } from '@/stores/panierLiveStore';
import { evaluerFraicheurPrix } from '@/lib/fiabilitePrix';
import { dates } from '@/lib/dates';
import { formatPrix } from '@/lib/format';
import { t } from '@/lib/i18n';

export default function CommandesDemo() {
  const { colors } = useTheme();
  const profil = useProfilStore((state) => state.profil);
  const reprendre = usePanierLiveStore((state) => state.reprendreDepuisCommande);
  const query = useQuery({
    queryKey: ['commandes-demo', profil?.id],
    queryFn: () => fetchCommandesDemo(profil!.id),
    enabled: Boolean(profil),
  });

  return (
    <ScreenScroll tabBar={false} contentContainerStyle={{ gap: 18 }}>
      <View style={{ gap: 5 }}>
        <DisplayLG>{t('historique_demo.titre')}</DisplayLG>
        <Body>{t('historique_demo.description')}</Body>
      </View>
      {query.isLoading ? <Caption accessibilityLiveRegion="polite">{t('commun.chargement')}</Caption> : null}
      {query.isError ? (
        <Card style={{ padding: 16, gap: 10 }}>
          <BodySm accessibilityRole="alert">{t('historique_demo.erreur')}</BodySm>
          <Button variant="secondary" label={t('commun.reessayer')} onPress={() => void query.refetch()} />
        </Card>
      ) : null}
      {!query.isLoading && !query.isError && (query.data?.length ?? 0) === 0 ? (
        <EmptyState
          illustration="courses"
          titre={t('historique_demo.vide_titre')}
          sousTitre={t('historique_demo.vide_description')}
        />
      ) : null}
      {query.data?.map((commande) => {
        const fraicheur = evaluerFraicheurPrix(commande.collecteLe);
        return (
          <Card key={commande.id} style={{ padding: 18, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ShoppingBag size={20} color={colors.primary} accessible={false} />
              <View style={{ flex: 1 }}>
                <BodySm style={{ fontWeight: '700' }}>
                  {dates.formatDateHeureCourte(new Date(commande.createdAt))}
                </BodySm>
                <Caption>{t('historique_demo.enseignes', { count: commande.paniers.length })}</Caption>
              </View>
              <Price>{formatPrix(commande.montantTotal)}</Price>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <Badge label={t('checkout.badge_demo')} variant="warning" />
              <Badge label={t(`checkout.fraicheur_${fraicheur.statut}`)} variant="neutral" />
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/commande-demo', params: { commandeId: commande.id } })}
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <BodySm style={{ color: colors.primary, fontWeight: '700' }}>
                {t('historique_demo.voir_detail')}
              </BodySm>
            </Pressable>
            {commande.reprenable ? (
              <Button
                variant="secondary"
                label={t('historique_demo.reprendre')}
                onPress={() => {
                  reprendre(commande);
                  router.push('/panier-en-ligne');
                }}
              />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Clock3 size={16} color={colors.textMuted} accessible={false} />
                <Caption>{t('historique_demo.ancien_format')}</Caption>
              </View>
            )}
          </Card>
        );
      })}
    </ScreenScroll>
  );
}
