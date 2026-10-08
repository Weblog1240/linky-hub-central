import { supabase } from "@/integrations/supabase/client";
import { resolveProfilePicture } from "@/lib/profile-picture";

export type LinkRow = {
  id: string;
  title: string;
  description: string | null;
  url: string;
  kind: string;
  position: number;
  visible: boolean;
  clicks: number;
};
export type Settings = { title: string; tagline: string; bio: string; avatar_url: string | null; avatar_src: string | null };

export const KINDS = [
  { value: "whatsapp_group", label: "WhatsApp Group" },
  { value: "whatsapp_channel", label: "WhatsApp Channel" },
  { value: "telegram_group", label: "Telegram Group" },
  { value: "telegram_channel", label: "Telegram Channel" },
  { value: "other", label: "Other link" },
];

export async function fetchSettings(): Promise<Settings> {
  const { data, error } = await supabase.from("site_settings").select("title,tagline,bio,avatar_url").eq("id", 1).single();
  if (error) throw error;
  let avatar_src: string | null = null;
  try { avatar_src = await resolveProfilePicture(data.avatar_url); } catch { /* Keep the page usable if a photo is unavailable. */ }
  return { ...data, avatar_src };
}
export async function fetchLinks(): Promise<LinkRow[]> {
  const { data, error } = await supabase.from("links").select("*").order("position");
  if (error) throw error;
  return data as LinkRow[];
}
