/**
 * Brand Voice Profiles — Custom tones save karo aur reuse karo.
 *
 * User apna brand voice define kar sakta hai:
 * - Tone (professional, casual, funny, etc.)
 * - Keywords (words to use)
 * - Avoid words
 * - Examples
 * - Hashtag style
 *
 * Jab bhi AI caption generate ho, ye profile use hota hai.
 */

import { createClient } from "@supabase/supabase-js";

export interface BrandVoiceProfile {
  id: string;
  user_id: string;
  name: string;
  tone: string;
  keywords: string[];
  avoidWords: string[];
  examples: string[];
  hashtagStyle: "none" | "minimal" | "moderate" | "heavy";
  emojiUsage: "none" | "minimal" | "moderate" | "heavy";
  language: string;
  description: string;
  isDefault: boolean;
  created_at: string;
}

function fromRow(row: Record<string, unknown>): BrandVoiceProfile {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    name: String(row.name),
    tone: String(row.tone ?? "casual"),
    keywords: (row.keywords as string[]) ?? [],
    avoidWords: (row.avoid_words as string[]) ?? [],
    examples: (row.examples as string[]) ?? [],
    hashtagStyle: (row.hashtag_style as BrandVoiceProfile["hashtagStyle"]) ?? "moderate",
    emojiUsage: (row.emoji_usage as BrandVoiceProfile["emojiUsage"]) ?? "moderate",
    language: String(row.language ?? "english"),
    description: String(row.description ?? ""),
    isDefault: Boolean(row.is_default),
    created_at: String(row.created_at),
  };
}

function toRow(profile: Omit<BrandVoiceProfile, "id" | "user_id" | "created_at">) {
  return {
    name: profile.name,
    tone: profile.tone,
    keywords: profile.keywords,
    avoid_words: profile.avoidWords,
    examples: profile.examples,
    hashtag_style: profile.hashtagStyle,
    emoji_usage: profile.emojiUsage,
    language: profile.language,
    description: profile.description,
    is_default: profile.isDefault,
  };
}
export async function saveProfile(
  userId: string,
  profile: Omit<BrandVoiceProfile, "id" | "user_id" | "created_at">
): Promise<BrandVoiceProfile> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Agar default hai to baaki ke defaults hatao
  if (profile.isDefault) {
    await supabase
      .from("brand_voice_profiles")
      .update({ is_default: false })
      .eq("user_id", userId)
      .eq("is_default", true);
  }

  const { data, error } = await supabase
    .from("brand_voice_profiles")
    .insert({
      user_id: userId,
      ...toRow(profile),
    })
    .select()
    .single();

  if (error) throw error;
  return fromRow(data as Record<string, unknown>);
}

/**
 * User ki saari brand voice profiles nikalo.
 */
export async function getProfiles(userId: string): Promise<BrandVoiceProfile[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("brand_voice_profiles")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => fromRow(row as Record<string, unknown>));
}

/**
 * Default profile nikalo.
 */
export async function getDefaultProfile(userId: string): Promise<BrandVoiceProfile | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await supabase
    .from("brand_voice_profiles")
    .select("*")
    .eq("user_id", userId)
    .eq("is_default", true)
    .single();

  return data ? fromRow(data as Record<string, unknown>) : null;
}

/**
 * Profile delete karo.
 */
export async function deleteProfile(profileId: string, userId: string): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await supabase
    .from("brand_voice_profiles")
    .delete()
    .eq("id", profileId)
    .eq("user_id", userId);
}

/**
 * Brand voice profile se AI prompt banao.
 */
export function buildVoicePrompt(profile: BrandVoiceProfile): string {
  const parts: string[] = [];

  parts.push(`Write in a ${profile.tone} tone.`);

  if (profile.description) {
    parts.push(`Brand voice: ${profile.description}`);
  }

  if (profile.keywords.length > 0) {
    parts.push(`Use these words/phrases when natural: ${profile.keywords.join(", ")}`);
  }

  if (profile.avoidWords.length > 0) {
    parts.push(`Avoid these words: ${profile.avoidWords.join(", ")}`);
  }

  if (profile.emojiUsage !== "none") {
    const emojiMap = {
      minimal: "Use 1-2 emojis per post",
      moderate: "Use 3-5 emojis per post",
      heavy: "Use emojis liberally throughout",
    };
    parts.push(emojiMap[profile.emojiUsage]);
  }

  const hashtagMap = {
    none: "Do not use any hashtags",
    minimal: "Use 1-2 hashtags at the end",
    moderate: "Use 3-5 hashtags at the end",
    heavy: "Use 7-10 hashtags at the end",
  };
  parts.push(hashtagMap[profile.hashtagStyle]);

  if (profile.language && profile.language !== "english") {
    parts.push(`Write in ${profile.language}`);
  }

  if (profile.examples.length > 0) {
    parts.push(`\nExamples of our voice:\n${profile.examples.slice(0, 3).map((e) => `- "${e}"`).join("\n")}`);
  }

  return parts.join(" ");
}
