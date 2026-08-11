/** Point d'entree — la session serveur prime sur l'etat local du device. */
import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useProfilStore } from '@/stores/profilStore';

type Destination = '/(auth)/connexion' | '/(auth)/onboarding' | '/(tabs)';

export default function Index() {
  const profil = useProfilStore((s) => s.profil);
  const [destination, setDestination] = useState<Destination | null>(null);

  useEffect(() => {
    let actif = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!actif) return;
      if (!data.session?.user) setDestination('/(auth)/connexion');
      else setDestination(profil ? '/(tabs)' : '/(auth)/onboarding');
    });
    return () => {
      actif = false;
    };
  }, [profil]);

  if (!destination) return null;
  return <Redirect href={destination} />;
}
