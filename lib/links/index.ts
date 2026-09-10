/**
 * Link Shortener — URLs short karo aur clicks track karo.
 *
 * Features:
 * - Custom short codes banao
 * - Click count track karo
 * - UTM parameters auto-add karo
 * - Platform-wise click breakdown
 */

import { createClient } from "@supabase/supabase-js";

export interface ShortLink {
  id: string;
  user_id: string;
  original_url: string;
  short_code: string;
  short_url: string;
  clicks: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  created_at: string;
}

/**
 * Short link banao.
 */
export async function createShortLink(
  userId: string,
  originalUrl: string,
  options?: {
    customCode?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  }
): Promise<ShortLink> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Short code generate karo
  const shortCode = options?.customCode || generateShortCode();

  // Check if code already exists
  const { data: existing } = await supabase
    .from("short_links")
    .select("id")
    .eq("short_code", shortCode)
    .single();

  if (existing) {
    throw new Error("Short code already taken. Try another.");
  }

  // Add UTM params to original URL
  let finalUrl = originalUrl;
  const utmParams = new URLSearchParams();
  if (options?.utmSource) utmParams.set("utm_source", options.utmSource);
  if (options?.utmMedium) utmParams.set("utm_medium", options.utmMedium);
  if (options?.utmCampaign) utmParams.set("utm_campaign", options.utmCampaign);

  if (utmParams.toString()) {
    const separator = originalUrl.includes("?") ? "&" : "?";
    finalUrl = `${originalUrl}${separator}${utmParams.toString()}`;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const { data, error } = await supabase
    .from("short_links")
    .insert({
      user_id: userId,
      original_url: finalUrl,
      short_code: shortCode,
      short_url: `${baseUrl}/l/${shortCode}`,
      clicks: 0,
      utm_source: options?.utmSource ?? null,
      utm_medium: options?.utmMedium ?? null,
      utm_campaign: options?.utmCampaign ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ShortLink;
}

/**
 * Short link ki click count increment karo.
 */
export async function trackClick(shortCode: string): Promise<string | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: link } = await supabase
    .from("short_links")
    .select("original_url, id, clicks")
    .eq("short_code", shortCode)
    .single();

  if (!link) return null;

  const { error: rpcError } = await supabase.rpc("increment_clicks", {
    link_id: link.id,
  });

  if (rpcError) {
    await supabase
      .from("short_links")
      .update({ clicks: (link.clicks ?? 0) + 1 })
      .eq("id", link.id);
  }

  return link.original_url;
}

/**
 * User ki saari short links nikalo.
 */
export async function getUserLinks(userId: string): Promise<ShortLink[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("short_links")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ShortLink[];
}

/**
 * Link delete karo.
 */
export async function deleteLink(id: string, userId: string): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await supabase
    .from("short_links")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
}

function generateShortCode(length: number = 6): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
