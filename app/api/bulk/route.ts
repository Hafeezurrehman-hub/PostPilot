/**
 * POST /api/bulk — Import multiple posts from CSV or JSON
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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

function parseCSV(csv: string) {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row");

  const header = lines[0].toLowerCase().split(",").map(h => h.trim());
  const contentIdx = header.indexOf("content");
  const platformsIdx = header.indexOf("platforms");
  const scheduledIdx = header.indexOf("scheduled_for");
  const mediaIdx = header.indexOf("media_url");

  if (contentIdx === -1 || platformsIdx === -1) {
    throw new Error("CSV must have 'content' and 'platforms' columns. Optional: scheduled_for, media_url");
  }

  const posts = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseCSVLine(line);
    const content = cols[contentIdx] ?? "";
    const platforms = (cols[platformsIdx] ?? "").split(";").map(p => p.trim().toLowerCase()).filter(Boolean);
    if (!content || platforms.length === 0) continue;
    posts.push({
      content,
      platforms,
      scheduled_for: cols[scheduledIdx] || null,
      media_url: cols[mediaIdx] || null,
    });
  }
  return posts;
}

function parseJSON(json: string) {
  const data = JSON.parse(json);
  if (!Array.isArray(data)) throw new Error("JSON must be an array of post objects");

  return data
    .filter((item: Record<string, unknown>) => item.content && item.platforms)
    .map((item: Record<string, unknown>) => ({
      content: String(item.content),
      platforms: Array.isArray(item.platforms)
        ? (item.platforms as string[]).map((p: string) => p.toLowerCase())
        : String(item.platforms).split(",").map((p: string) => p.trim().toLowerCase()),
      scheduled_for: item.scheduled_for ? String(item.scheduled_for) : null,
      media_url: item.media_url ? String(item.media_url) : null,
    }));
}

export async function POST(request: NextRequest) {
  let body: {
    format?: "csv" | "json";
    data?: string;
    userId?: string;
    mode?: "draft" | "scheduled";
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.data || !body.userId) {
    return NextResponse.json({ error: "data and userId are required" }, { status: 400 });
  }

  // Parse input
  let posts: Array<{ content: string; platforms: string[]; scheduled_for: string | null; media_url: string | null }>;
  try {
    if (body.format === "json") {
      posts = parseJSON(body.data);
    } else {
      posts = parseCSV(body.data);
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Parse error" },
      { status: 400 }
    );
  }

  if (posts.length === 0) {
    return NextResponse.json({ error: "No valid posts found in input" }, { status: 400 });
  }

  // Import into DB
  const supabase = getSupabase();
  const errors: Array<{ index: number; error: string }> = [];
  let imported = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const isScheduled = body.mode === "scheduled" && post.scheduled_for;

    try {
      const { error } = await supabase.from("posts").insert({
        user_id: body.userId,
        content: post.content,
        platforms: post.platforms,
        media_url: post.media_url ?? null,
        status: isScheduled ? "scheduled" : "draft",
        scheduled_for: isScheduled ? new Date(post.scheduled_for!).toISOString() : null,
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

  return NextResponse.json({
    total: posts.length,
    imported,
    failed: errors.length,
    errors,
  });
}
