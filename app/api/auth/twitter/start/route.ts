import { NextResponse } from "next/server";
import { generateState } from "@/lib/oauth/state";
import { generateCodeChallenge, generateCodeVerifier, oauthCookieOptions } from "@/lib/oauth/pkce";

export async function GET() {
  const clientId = process.env.TWITTER_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "TWITTER_CLIENT_ID is not set in .env.local yet." },
      { status: 501 }
    );
  }

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/twitter/callback`;
  const scope = "tweet.read tweet.write users.read offline.access";

  const authUrl = new URL("https://twitter.com/i/oauth2/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set("twitter_oauth_state", state, oauthCookieOptions);
  response.cookies.set("twitter_code_verifier", codeVerifier, oauthCookieOptions);
  return response;
}
