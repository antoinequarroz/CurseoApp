/** Courses — liste generee, comparateur de prix, mode d'optimisation, recapitulatif panier. */
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useTheme } from '@/lib/theme-context';
import { useHaptics } from '@/hooks/useHaptics';
import { useCoursesStore } from '@/stores/coursesStore';
import { usePanierStore } from '@/stores/panierStore';
import { useProfilStore } from '@/stores/profilStore';
import { supabase } from '@/lib/supabase';
import { ListeCourses } from '@/components/courses/ListeCourses';
import { RecapCommande } from '@/components/panier/RecapCommande';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { PaywallModal } from '@/components/ui/PaywallModal';
import { DisplayLG, Subheading } from '@/components/ui/Typography';
import { toast } from '@/lib/toast';
import { analytics } from '@/lib/analytics';
import type { ModeOptimisation, NiveauAbonnement } from '@/types';

const MODES: { id: ModeOptimisation; label: string }[] = [
  { id: 'prix_minimum', label: 'Prix minimum' },
  { id: 'equilibre', label: 'Équilibré' },
  { id: 'premium', label: 'Premium' },
  { id: 'bio', label: 'Bio' },
  { id: 'sante', label: 'Santé' },
];

export default function Courses() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const { items, toggleCoche } = useCoursesStore();
  const { mode, recap, setMode, calculer } = usePanierStore();
  const profil = useProfilStore((s) => s.profil);
  const [paywallVisible, setPaywallVisible] = useState(false);

  useEffect(() => {
    if (items.length > 0) calculer(items);
  }, [items, calculer]);

  const validerCommande = async () => {
    if (!recap) return;
    if (profil) {
      await supabase.from('commandes').insert({
        profil_id: profil.id,
        paniers: recap.paniers,
        montant_total: recap.montant_total,
        economies: recap.economies,
      });
    }
    toast.economies(recap.economies);
  };

  if (items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', paddingTop: 60 }}>
        <EmptyState
          illustration="courses"
          titre="Rien dans ta liste"
          sousTitre="Planifie ta semaine pour générer ta liste automatiquement."
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: 60 }}>
      <OfflineBanner />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 100 }}>
        <DisplayLG>Courses</DisplayLG>

        <View>
          <Subheading>Mode d&apos;optimisation</Subheading>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            {MODES.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => {
                  void haptics.selection();
                  setMode(m.id);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: mode === m.id }}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 9999,
                  backgroundColor: mode === m.id ? colors.primary : colors.bgSecondary,
                  marginRight: 8,
                }}
              >
                <Subheading style={{ color: mode === m.id ? '#FFFFFF' : colors.textPrimary }}>{m.label}</Subheading>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <ListeCourses items={items} onToggle={toggleCoche} />

        {recap && (
          <RecapCommande
            recap={recap}
            onValider={() => {
              void validerCommande();
            }}
          />
        )}
      </ScrollView>

      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        onChoisir={(palier: NiveauAbonnement) => {
          analytics.subscriptionStarted(palier);
          setPaywallVisible(false);
        }}
        featureOrigine="courses"
      />
    </View>
  );
}
