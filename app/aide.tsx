/** COUR-28 : Aide & support — FAQ, contact, informations de version. Contenu 100% statique, rien de "pas encore disponible" presente comme actif. */
import React, { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import Constants from 'expo-constants';
import { ChevronRight, Mail } from 'lucide-react-native';
import { useTheme } from '@/lib/theme-context';
import { getCurrentVersion } from '@/lib/whatsNew';
import { toast } from '@/lib/toast';
import { Card } from '@/components/ui/Card';
import { ScreenScroll } from '@/components/ui/Screen';
import { DisplayLG, Heading, Body, BodySm, Caption } from '@/components/ui/Typography';
import { t } from '@/lib/i18n';

const EMAIL_SUPPORT = 'support@coursia.app';

const CLES_FAQ = ['courses', 'planning', 'famille', 'abonnement', 'confidentialite'] as const;

function LigneFaq({ question, reponse }: { question: string; reponse: string }) {
  const { colors } = useTheme();
  const [ouvert, setOuvert] = useState(false);
  return (
    <Pressable
      onPress={() => setOuvert((v) => !v)}
      accessibilityRole="button"
      accessibilityState={{ expanded: ouvert }}
      accessibilityLabel={question}
      style={{ paddingVertical: 10 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Body style={{ flex: 1 }}>{question}</Body>
        <ChevronRight size={18} color={colors.textMuted} style={{ transform: [{ rotate: ouvert ? '90deg' : '0deg' }] }} />
      </View>
      {ouvert && <BodySm style={{ marginTop: 6 }}>{reponse}</BodySm>}
    </Pressable>
  );
}

export default function Aide() {
  const { colors } = useTheme();
  const version = getCurrentVersion();
  const buildNumber = Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode ?? null;

  const contacterSupport = async () => {
    const url = `mailto:${EMAIL_SUPPORT}?subject=${encodeURIComponent(t('aide.email_sujet'))}`;
    const peutOuvrir = await Linking.canOpenURL(url);
    if (!peutOuvrir) {
      toast.erreur(t('aide.erreur_email'));
      return;
    }
    void Linking.openURL(url);
  };

  return (
    <ScreenScroll contentContainerStyle={{ gap: 18 }} tabBar={false}>
      <View>
        <DisplayLG>{t('aide.titre')}</DisplayLG>
        <BodySm>{t('aide.sous_titre')}</BodySm>
      </View>

      <Card style={{ padding: 20, gap: 4, borderRadius: 28, borderTopLeftRadius: 28 }}>
        <Heading>{t('aide.faq_titre')}</Heading>
        {CLES_FAQ.map((cle) => (
          <LigneFaq key={cle} question={t(`aide.faq_${cle}_question`)} reponse={t(`aide.faq_${cle}_reponse`)} />
        ))}
      </Card>

      <Pressable onPress={() => void contacterSupport()} accessibilityRole="button" accessibilityLabel={t('aide.contact_titre')}>
        <Card style={{ padding: 20, gap: 4, borderRadius: 28, borderTopLeftRadius: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Mail size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Heading>{t('aide.contact_titre')}</Heading>
              <Caption>{EMAIL_SUPPORT}</Caption>
            </View>
          </View>
        </Card>
      </Pressable>

      <Card style={{ padding: 20, gap: 4, borderRadius: 28, borderTopLeftRadius: 28 }}>
        <Heading>{t('aide.version_titre')}</Heading>
        <Caption>{t('aide.version_numero', { version, build: buildNumber ?? '—' })}</Caption>
      </Card>
    </ScreenScroll>
  );
}
