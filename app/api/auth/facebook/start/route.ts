import { NextResponse } from "next/server";
import { generateState } from "@/lib/oauth/state";
import { oauthCookieOptions } from "@/lib/oauth/pkce";

export async function GET() {
  const clientId = process.env.FACEBOOK_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "FACEBOOK_CLIENT_ID is not set in .env.local yet." },
      { status: 501 }
    );
  }

  const state = generateState();
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/facebook/callback`;
  const scope = [
    "pages_manage_posts",
    "pages_read_engagement",
    "pages_show_list",
    "instagram_basic",
    "instagram_content_publish",
  ].join(",");

  const authUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", scope);

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set("facebook_oauth_state", state, oauthCookieOptions);
  return response;
}
