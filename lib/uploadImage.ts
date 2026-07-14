/** Upload securise des photos de recettes communautaires vers Supabase Storage. */
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';

const MAX_FILE_SIZE_MB = 5;
const MAX_WIDTH_PX = 1200;
const QUALITY = 0.82;

export async function uploadRecetteImage(uri: string, userId: string): Promise<string> {
  const compressed = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_WIDTH_PX } }],
    { compress: QUALITY, format: ImageManipulator.SaveFormat.JPEG },
  );

  const response = await fetch(compressed.uri);
  const blob = await response.blob();
  if (blob.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    throw new Error(`Image trop lourde. Maximum ${MAX_FILE_SIZE_MB}MB.`);
  }

  // Nom de fichier genere — jamais le nom original (risque de path traversal).
  const fileName = `recettes/${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;

  const { error } = await supabase.storage.from('images').upload(fileName, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('images').getPublicUrl(fileName);
  return data.publicUrl;
}
