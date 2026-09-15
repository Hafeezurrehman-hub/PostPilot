/**
 * POST /api/auth/whatsapp/recipients
 *
 * Saves the list of recipient phone numbers this user's WhatsApp broadcast
 * should go out to. Stored as a JSON array string in
 * platform_connections.external_id — reusing the same generic column
 * Telegram's chat ID uses.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { recipients } = await request.json();

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json({ error: "At least one recipient number is required" }, { status: 400 });
  }

  // Basic sanity check — digits only, 8-15 chars (E.164 without '+')
  const cleaned = recipients
    .map((r: string) => String(r).replace(/[^0-9]/g, ""))
    .filter((r: string) => r.length >= 8 && r.length <= 15);

  if (cleaned.length === 0) {
    return NextResponse.json({ error: "No valid phone numbers found" }, { status: 400 });
  }

  const { error } = await supabase
    .from("platform_connections")
    .update({ external_id: JSON.stringify(cleaned) })
    .eq("user_id", user.id)
    .eq("platform", "whatsapp");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, count: cleaned.length });
}
