/**
 * GET    /api/links — List user's short links
 * POST   /api/links — Create a short link
 * DELETE /api/links — Delete a short link
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabase() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(`Missing env: URL=${!!supabaseUrl}, KEY=${!!supabaseKey}`);
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll() {},
    },
  });
}

function generateShortCode(length = 6): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function GET(_request: NextRequest) {
  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error("Links auth error:", authError.message);
      return NextResponse.json({ error: "Auth error: " + authError.message }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("short_links")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Links query error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ links: data ?? [] });
  } catch (err) {
    console.error("GET /api/links error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: {
      originalUrl?: string;
      customCode?: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!body.originalUrl) {
      return NextResponse.json({ error: "originalUrl is required" }, { status: 400 });
    }

    try {
      new URL(body.originalUrl);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    const shortCode = body.customCode?.trim() || generateShortCode();

    const { data: existing } = await supabase
      .from("short_links")
      .select("id")
      .eq("short_code", shortCode)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Short code already taken. Try another." }, { status: 409 });
    }

    let finalUrl = body.originalUrl;
    const utmParams = new URLSearchParams();
    if (body.utmSource) utmParams.set("utm_source", body.utmSource);
    if (body.utmMedium) utmParams.set("utm_medium", body.utmMedium);
    if (body.utmCampaign) utmParams.set("utm_campaign", body.utmCampaign);

    if (utmParams.toString()) {
      const separator = body.originalUrl.includes("?") ? "&" : "?";
      finalUrl = `${body.originalUrl}${separator}${utmParams.toString()}`;
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const { data, error } = await supabase
      .from("short_links")
      .insert({
        user_id: user.id,
        original_url: finalUrl,
        short_code: shortCode,
        short_url: `${baseUrl}/l/${shortCode}`,
        clicks: 0,
        utm_source: body.utmSource || null,
        utm_medium: body.utmMedium || null,
        utm_campaign: body.utmCampaign || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ link: data });
  } catch (err) {
    console.error("POST /api/links error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await getSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { id?: string };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("short_links")
      .delete()
      .eq("id", body.id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/links error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
