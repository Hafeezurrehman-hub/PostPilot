import { NextResponse } from "next/server";
import { generateState } from "@/lib/oauth/state";
import { oauthCookieOptions } from "@/lib/oauth/pkce";

/**
 * Pinterest OAuth — Pin create karne ke liye
 */
export async function GET() {
  const appId = process.env.PINTEREST_APP_ID;

  if (!appId) {
    return NextResponse.json(
      { error: "PINTEREST_APP_ID is not set in .env.local yet." },
      { status: 501 }
    );
  }

  const state = generateState();
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/pinterest/callback`;
  const scope = "boards:read,pins:read,pins:write,boards:write";

  const authUrl = new URL("https://www.pinterest.com/oauth/");
  authUrl.searchParams.set("client_id", appId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("response_type", "code");

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set("pinterest_oauth_state", state, oauthCookieOptions);
  return response;
}
