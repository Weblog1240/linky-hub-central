import { supabase } from "@/integrations/supabase/client";

export const PROFILE_BUCKET = "profile-pictures";
export const PROFILE_PREFIX = `${PROFILE_BUCKET}/`;
export const MAX_PROFILE_SIZE = 5 * 1024 * 1024;
const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function validateProfilePicture(file: File): string | null {
  if (!extensions[file.type]) return "Choose a JPG, PNG or WebP picture.";
  if (file.size === 0) return "This picture is empty. Choose another file.";
  if (file.size > MAX_PROFILE_SIZE) return "Choose a picture smaller than 5 MB.";
  return null;
}

export async function resolveProfilePicture(value: string | null): Promise<string | null> {
  if (!value?.startsWith(PROFILE_PREFIX)) return value;
  const { data, error } = await supabase.storage.from(PROFILE_BUCKET)
    .createSignedUrl(value.slice(PROFILE_PREFIX.length), 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function uploadProfilePicture(file: File): Promise<string> {
  const validation = validateProfilePicture(file);
  if (validation) throw new Error(validation);
  const path = `${crypto.randomUUID()}.${extensions[file.type]}`;
  const { error } = await supabase.storage.from(PROFILE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return `${PROFILE_PREFIX}${path}`;
}