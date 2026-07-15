/** Ecoute les changements de session Supabase et redirige proprement si elle expire. */
import React, { useEffect, useState } from 'react';
import { Modal, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useProfilStore } from '@/stores/profilStore';
import { queryClient } from '@/lib/queryClient';
import { Heading, BodySm } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/lib/theme-context';
import { t } from '@/lib/i18n';

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const [sessionExpiree, setSessionExpiree] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        useProfilStore.getState().reset();
        queryClient.clear();
        setSessionExpiree(true);
      }
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  return (
    <>
      {children}
      <Modal visible={sessionExpiree} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: colors.bgElevated, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 12 }}>
            <Heading>{t('session.expiree_titre')}</Heading>
            <BodySm>{t('session.expiree_message')}</BodySm>
            <Button
              label={t('session.se_reconnecter')}
              onPress={() => {
                setSessionExpiree(false);
                router.replace('/(auth)/connexion');
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}
