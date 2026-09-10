import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptSecret } from "@/lib/crypto/tokens";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const savedState = request.cookies.get("facebook_oauth_state")?.value;

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(
      new URL("/dashboard/connect?error=state_mismatch", request.url)
    );
  }

  const clientId = process.env.FACEBOOK_CLIENT_ID!;
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/facebook/callback`;

  const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
  tokenUrl.searchParams.set("client_id", clientId);
  tokenUrl.searchParams.set("client_secret", clientSecret);
  tokenUrl.searchParams.set("redirect_uri", redirectUri);
  tokenUrl.searchParams.set("code", code);

  const tokenRes = await fetch(tokenUrl.toString());
  if (!tokenRes.ok) {
    return NextResponse.redirect(
      new URL("/dashboard/connect?error=token_exchange_failed", request.url)
    );
  }
  const { access_token: userToken } = await tokenRes.json();

  const pagesRes = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?access_token=${userToken}`
  );
  const pagesData = pagesRes.ok ? await pagesRes.json() : { data: [] };
  const page = pagesData.data?.[0];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!page) {
    const response = NextResponse.redirect(
      new URL("/dashboard/connect?error=no_facebook_page", request.url)
    );
    response.cookies.delete("facebook_oauth_state");
    return response;
  }

  const encryptedPageToken = encryptSecret(page.access_token);

  await supabase.from("platform_connections").upsert(
    {
      user_id: user.id,
      platform: "facebook",
      access_token: encryptedPageToken,
      platform_username: page.name,
    },
    { onConflict: "user_id,platform" }
  );

  const igRes = await fetch(
    `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
  );
  const igData = igRes.ok ? await igRes.json() : null;
  const igAccountId = igData?.instagram_business_account?.id;

  if (igAccountId) {
    const igProfileRes = await fetch(
      `https://graph.facebook.com/v21.0/${igAccountId}?fields=username&access_token=${page.access_token}`
    );
    const igProfile = igProfileRes.ok ? await igProfileRes.json() : null;

    await supabase.from("platform_connections").upsert(
      {
        user_id: user.id,
        platform: "instagram",
        access_token: encryptedPageToken,
        platform_username: igProfile?.username ?? igAccountId,
      },
      { onConflict: "user_id,platform" }
    );
  }

  const response = NextResponse.redirect(new URL("/dashboard/connect", request.url));
  response.cookies.delete("facebook_oauth_state");
  return response;
}
