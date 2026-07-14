/** Mutation : signalement communautaire d'une recette (moderation, voir supabase/schema.sql §signalements). */
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useProfilStore } from '@/stores/profilStore';
import { toast } from '@/lib/toast';

export type MotifSignalement =
  | 'contenu_inapproprie'
  | 'spam_publicite'
  | 'information_incorrecte'
  | 'plagiat'
  | 'autre';

interface SignalerRecetteInput {
  recetteId: string;
  raison: MotifSignalement;
  detail?: string;
}

async function signalerRecette({ recetteId, raison, detail }: SignalerRecetteInput, profilId: string) {
  const { error } = await supabase.from('signalements').insert({
    recette_id: recetteId,
    signale_par: profilId,
    raison,
    detail: detail?.trim() ? detail.trim() : null,
  });

  if (error) throw error;
}

/**
 * Signale une recette communautaire pour moderation. La contrainte unique
 * (recette_id, signale_par) empeche les doublons cote base — l'erreur (code
 * 23505, deja mappee en message clair) est geree par le handler global de
 * mutation dans lib/queryClient.ts.
 */
export function useSignalerRecette() {
  const profilId = useProfilStore((s) => s.profil?.id);

  return useMutation({
    mutationFn: (input: SignalerRecetteInput) => {
      if (!profilId) throw new Error('Profil introuvable');
      return signalerRecette(input, profilId);
    },
    onSuccess: () => {
      toast.succes('Merci, ton signalement a été transmis à l\'équipe de modération');
    },
  });
}
