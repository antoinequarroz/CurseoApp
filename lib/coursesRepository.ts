/** Accès Supabase de la liste de courses, isolé pour garder le store testable. */
import { supabase } from '@/lib/supabase';
import type { Json } from '@/supabase/database.types';
import type { ItemCourse } from '@/types';

export interface ListeCoursesDistante {
  id: string;
  planningId: string | null;
  items: ItemCourse[];
}

export async function chargerDerniereListeCourses(
  profilId: string,
): Promise<ListeCoursesDistante | null> {
  const { data, error } = await supabase
    .from('listes_courses')
    .select('id, planning_id, items')
    .eq('profil_id', profilId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    planningId: data.planning_id,
    items: Array.isArray(data.items) ? (data.items as unknown as ItemCourse[]) : [],
  };
}

export async function enregistrerListeCourses({
  profilId,
  listeId,
  planningId,
  items,
}: {
  profilId: string;
  listeId: string | null;
  planningId: string | null;
  items: ItemCourse[];
}): Promise<string> {
  const itemsJson = items as unknown as Json;

  if (listeId) {
    const { error } = await supabase
      .from('listes_courses')
      .update({ items: itemsJson, planning_id: planningId })
      .eq('id', listeId);
    if (error) throw error;
    return listeId;
  }

  const { data, error } = await supabase
    .from('listes_courses')
    .insert({ profil_id: profilId, planning_id: planningId, items: itemsJson })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}
