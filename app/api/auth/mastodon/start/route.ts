import { NextResponse } from "next/server";
import { generateState } from "@/lib/oauth/state";
import { oauthCookieOptions } from "@/lib/oauth/pkce";

/**
 * Mastodon OAuth — Federated social network
 *
 * Mastodon is instance-based. User enters their instance URL,
 * then OAuth happens on that instance.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const instanceUrl = url.searchParams.get("instance");

  if (!instanceUrl) {
    return NextResponse.json(
      { error: "Instance URL is required. Use ?instance=your.instance.social" },
      { status: 400 }
    );
  }

  // Clean instance URL
  const baseUrl = instanceUrl.replace(/\/$/, "");
  const clientId = process.env.MASTODON_CLIENT_ID;
  const clientSecret = process.env.MASTODON_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "MASTODON_CLIENT_ID/SECRET not configured. Generate at your instance's API settings." },
      { status: 501 }
    );
  }

  const state = generateState();
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/mastodon/callback`;

  const authUrl = new URL(`${baseUrl}/oauth/authorize`);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "read write follow");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("response_type", "code");

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set("mastodon_oauth_state", state, oauthCookieOptions);
  response.cookies.set("mastodon_instance", baseUrl, oauthCookieOptions);
  return response;
}
