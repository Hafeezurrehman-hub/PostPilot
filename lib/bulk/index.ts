/**
 * Bulk Publishing — CSV ya JSON se multiple posts upload karo.
 *
 * Format:
 * CSV: content, platforms (comma-separated), scheduled_for (optional), media_url (optional)
 * JSON: [{ content, platforms, scheduled_for, media_url }]
 */

import { createClient } from "@supabase/supabase-js";

export interface BulkPost {
  content: string;
  platforms: string[];
  scheduled_for?: string | null;
  media_url?: string | null;
}

export interface BulkImportResult {
  total: number;
  imported: number;
  failed: number;
  errors: Array<{ index: number; error: string }>;
}

/**
 * CSV string ko parse karke BulkPost array banao.
 */
export function parseCSV(csv: string): BulkPost[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return []; // Header + at least 1 row

  const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
  const contentIdx = header.indexOf("content");
  const platformsIdx = header.indexOf("platforms");
  const scheduledIdx = header.indexOf("scheduled_for");
  const mediaIdx = header.indexOf("media_url");

  if (contentIdx === -1 || platformsIdx === -1) {
    throw new Error("CSV must have 'content' and 'platforms' columns");
  }

  const posts: BulkPost[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCSVLine(line);

    posts.push({
      content: cols[contentIdx] ?? "",
      platforms: (cols[platformsIdx] ?? "")
        .split(";")
        .map((p) => p.trim().toLowerCase())
        .filter(Boolean),
      scheduled_for: cols[scheduledIdx] || null,
      media_url: cols[mediaIdx] || null,
    });
  }

  return posts.filter((p) => p.content && p.platforms.length > 0);
}

/**
 * JSON string ko parse karke BulkPost array banao.
 */
export function parseJSON(json: string): BulkPost[] {
  try {
    const data = JSON.parse(json);

    if (!Array.isArray(data)) {
      throw new Error("JSON must be an array of post objects");
    }

    return data
      .filter((item: Record<string, unknown>) => item.content && item.platforms)
      .map((item: Record<string, unknown>) => ({
        content: String(item.content),
        platforms: Array.isArray(item.platforms)
          ? (item.platforms as string[]).map((p) => p.toLowerCase())
          : String(item.platforms).split(",").map((p) => p.trim().toLowerCase()),
        scheduled_for: item.scheduled_for ? String(item.scheduled_for) : null,
        media_url: item.media_url ? String(item.media_url) : null,
      }));
  } catch (err) {
    throw new Error(`Invalid JSON: ${err instanceof Error ? err.message : "Parse error"}`);
  }
}

/**
 * Multiple posts DB me bulk import karo.
 */
export async function bulkImport(
  userId: string,
  posts: BulkPost[]
): Promise<BulkImportResult> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const errors: Array<{ index: number; error: string }> = [];
  let imported = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];

    try {
      const { error } = await supabase.from("posts").insert({
        user_id: userId,
        content: post.content,
        platforms: post.platforms,
        media_url: post.media_url ?? null,
        status: post.scheduled_for ? "scheduled" : "draft",
        scheduled_for: post.scheduled_for ? new Date(post.scheduled_for).toISOString() : null,
      });

      if (error) {
        errors.push({ index: i + 1, error: error.message });
      } else {
        imported++;
      }
    } catch (err) {
      errors.push({
        index: i + 1,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return {
    total: posts.length,
    imported,
    failed: errors.length,
    errors,
  };
}

/**
 * CSV line ko properly parse karo (quotes handle karo).
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}
