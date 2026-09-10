import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptSecret } from "@/lib/crypto/tokens";

/**
 * POST /api/auth/whatsapp/setup
 *
 * WhatsApp Business API token save karo.
 * User Meta Business Dashboard se permanent token generate karta hai
 * aur yahan submit karta hai.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { phoneNumberId, accessToken } = body;

  if (!phoneNumberId || !accessToken) {
    return NextResponse.json(
      { error: "Phone Number ID and Access Token are required" },
      { status: 400 }
    );
  }

  // Verify token by checking phone number
  const verifyRes = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=verified_name,display_phone_number`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!verifyRes.ok) {
    return NextResponse.json(
      { error: "Invalid token or phone number ID" },
      { status: 400 }
    );
  }

  const phoneData = await verifyRes.json();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await supabase.from("platform_connections").upsert(
    {
      user_id: user.id,
      platform: "whatsapp",
      access_token: encryptSecret(accessToken),
      refresh_token: encryptSecret(phoneNumberId),
      platform_username: phoneData.verified_name ?? phoneData.display_phone_number ?? null,
      expires_at: null, // Permanent tokens don't expire
    },
    { onConflict: "user_id,platform" }
  );

  return NextResponse.json({ success: true });
}
