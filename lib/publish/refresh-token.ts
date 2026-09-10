/**
 * OAuth Token Refresh — har platform ke liye token refresh logic.
 *
 * Platform-wise behavior:
 *
 * **Twitter/X:**
 * - Refresh token diya jaata hai OAuth ke waqt
 * - `grant_type=refresh_token` se naya access_token + refresh_token milta hai
 * - Access token expire hota hai ~2 hours me
 *
 * **LinkedIn:**
 * - LinkedIn OIDC (openid profile scope) me refresh_token milta hai
 * - `grant_type=refresh_token` se naya token milta hai
 * - Agar refresh_token nahi hai to user ko re-connect karna padega
 * - Token ~60 days tak valid rehta hai
 *
 * **Facebook/Instagram:**
 * - Short-lived user token (~1 hour) ko long-lived me exchange kar sakte ho
 * - `grant_type=fb_exchange_token` use hota hai
 * - Page tokens long-lived user token se banne pe indefinite rehte hain
 * - Agar page token expire ho jaye to long-lived user token se dubara fetch karo
 */

import { createClient } from "@supabase/supabase-js";
import { decryptSecret, encryptSecret } from "@/lib/crypto/tokens";

export interface RefreshResult {
  success: boolean;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  error?: string;
}

type Platform =
  | "twitter" | "linkedin" | "facebook" | "instagram"
  | "tiktok" | "threads" | "youtube" | "pinterest"
  | "reddit" | "mastodon" | "bluesky" | "google_business" | "whatsapp";

interface ConnectionRow {
  id: string;
  user_id: string;
  platform: string;
  access_token: string;
  refresh_token: string | null;
  platform_username: string | null;
  connected_at: string;
  expires_at: string | null;
}

/**
 * Check karo ki token expire ho chuka hai ya expiring soon hai (10 min buffer).
 */
export function isTokenExpired(connection: ConnectionRow, bufferMs = 10 * 60 * 1000): boolean {
  if (!connection.expires_at) return false; // No expiry set — assume valid
  const expiryTime = new Date(connection.expires_at).getTime();
  return Date.now() >= expiryTime - bufferMs;
}

/**
 * Token refresh karke DB me update karo.
 * Agar refresh ho jaye to naya access_token return karo.
 * Agar na ho to error return karo (user ko re-connect karna padega).
 */
export async function refreshToken(
  connection: ConnectionRow
): Promise<RefreshResult> {
  const platform = connection.platform as Platform;

  switch (platform) {
    case "twitter":
      return refreshTwitter(connection);
    case "linkedin":
      return refreshLinkedIn(connection);
    case "facebook":
    case "instagram":
    case "threads":
      return refreshFacebook(connection);
    case "youtube":
    case "google_business":
      return refreshGoogle(connection);
    case "reddit":
      return refreshReddit(connection);
    // Platforms that don't need token refresh:
    // tiktok, pinterest, mastodon, bluesky, whatsapp
    default:
      return { success: false, accessToken: connection.access_token, error: `Unknown platform: ${platform}` };
  }
}

/**
 * Ensure token valid hai — refresh agar zaroori hai.
 * Naya token DB me save hota hai.
 * Return karta hai updated access_token.
 */
export async function ensureValidToken(connection: ConnectionRow): Promise<string> {
  const decrypted: ConnectionRow = {
    ...connection,
    access_token: decryptSecret(connection.access_token) ?? "",
    refresh_token: decryptSecret(connection.refresh_token),
  };

  if (!isTokenExpired(decrypted)) {
    return decrypted.access_token;
  }

  console.log(`Token expired for ${decrypted.platform}, refreshing...`);
  const result = await refreshToken(decrypted);

  if (result.success) {
    console.log(`Token refreshed successfully for ${connection.platform}`);
    return result.accessToken;
  }

  console.log(`Token refresh failed for ${decrypted.platform}: ${result.error}`);
  return decrypted.access_token;
}

// ============================================================
// Platform-specific refresh functions
// ============================================================

async function refreshTwitter(conn: ConnectionRow): Promise<RefreshResult> {
  if (!conn.refresh_token) {
    return {
      success: false,
      accessToken: conn.access_token,
      error: "No refresh token available. Please reconnect your Twitter account.",
    };
  }

  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return {
      success: false,
      accessToken: conn.access_token,
      error: "Twitter API credentials not configured.",
    };
  }

  try {
    const res = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: conn.refresh_token,
        client_id: clientId,
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        success: false,
        accessToken: conn.access_token,
        error: errBody?.error_description ?? `Twitter refresh failed: ${res.status}`,
      };
    }

    const data = await res.json();
    const newAccessToken: string = data.access_token;
    const newRefreshToken: string = data.refresh_token ?? conn.refresh_token;
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    // DB me update karo
    await updateConnectionInDB(conn.id, {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expires_at: expiresAt,
    });

    return {
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresAt,
    };
  } catch (err) {
    return {
      success: false,
      accessToken: conn.access_token,
      error: err instanceof Error ? err.message : "Twitter refresh failed",
    };
  }
}

async function refreshLinkedIn(conn: ConnectionRow): Promise<RefreshResult> {
  if (!conn.refresh_token) {
    // LinkedIn OIDC refresh_token nahi hai — re-connect chahiye
    return {
      success: false,
      accessToken: conn.access_token,
      error: "No refresh token. Please reconnect your LinkedIn account.",
    };
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return {
      success: false,
      accessToken: conn.access_token,
      error: "LinkedIn API credentials not configured.",
    };
  }

  try {
    const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: conn.refresh_token,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!res.ok) {
      return {
        success: false,
        accessToken: conn.access_token,
        error: `LinkedIn refresh failed: ${res.status}. Please reconnect.`,
      };
    }

    const data = await res.json();
    const newAccessToken: string = data.access_token;
    const newRefreshToken: string = data.refresh_token ?? conn.refresh_token;
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    await updateConnectionInDB(conn.id, {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expires_at: expiresAt,
    });

    return {
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresAt,
    };
  } catch (err) {
    return {
      success: false,
      accessToken: conn.access_token,
      error: err instanceof Error ? err.message : "LinkedIn refresh failed",
    };
  }
}

/**
 * Facebook/Instagram — token refresh ka logic thoda alag hai:
 *
 * 1. Agar user_token hai (refresh_token ki jagah store hota hai), to use
 *    exchange karo long-lived token ke liye using fb_exchange_token.
 * 2. Phir long-lived user token se Page tokens dubara fetch karo.
 * 3. Facebook/Instagram dono ka token update karo (dono same Page token use karte hain).
 *
 * Note: Facebook Page tokens normally expire nahi karte agar user token
 * long-lived hai. But safety ke liye ye refresh logic hai.
 */
async function refreshFacebook(conn: ConnectionRow): Promise<RefreshResult> {
  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return {
      success: false,
      accessToken: conn.access_token,
      error: "Facebook API credentials not configured.",
    };
  }

  try {
    // Step 1: Current access token se Page tokens dubara fetch karo
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?access_token=${conn.access_token}`
    );

    if (!pagesRes.ok) {
      // Token puri tarah expired hai — re-connect chahiye
      return {
        success: false,
        accessToken: conn.access_token,
        error: "Facebook token expired. Please reconnect your Facebook account.",
      };
    }

    const pagesData = await pagesRes.json();
    const pages = pagesData.data ?? [];

    if (pages.length === 0) {
      return {
        success: false,
        accessToken: conn.access_token,
        error: "No Facebook Pages found. Please reconnect.",
      };
    }

    // Pehle page ka token use karo (same as connect flow)
    const page = pages[0];
    const newAccessToken: string = page.access_token;

    // DB me Facebook ka token update karo
    await updateConnectionInDB(conn.id, {
      access_token: newAccessToken,
      // Facebook page tokens don't expire — expires_at remove karo
      expires_at: null,
    });

    // Agar Instagram bhi connected hai to uska token bhi update karo
    if (conn.platform === "facebook") {
      // Instagram ka connection nikalo aur update karo
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: igConn } = await supabase
        .from("platform_connections")
        .select("id")
        .eq("user_id", conn.user_id)
        .eq("platform", "instagram")
        .single();

      if (igConn) {
        await updateConnectionInDB(igConn.id, {
          access_token: newAccessToken,
          expires_at: null,
        });
      }
    }

    return {
      success: true,
      accessToken: newAccessToken,
      expiresAt: undefined, // No expiry for page tokens
    };
  } catch (err) {
    return {
      success: false,
      accessToken: conn.access_token,
      error: err instanceof Error ? err.message : "Facebook token refresh failed",
    };
  }
}

// ============================================================
// Google refresh (YouTube / Google Business)
// ============================================================

async function refreshGoogle(conn: ConnectionRow): Promise<RefreshResult> {
  if (!conn.refresh_token) {
    return {
      success: false,
      accessToken: conn.access_token,
      error: "No refresh token. Please reconnect your Google account.",
    };
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return {
      success: false,
      accessToken: conn.access_token,
      error: "Google API credentials not configured.",
    };
  }

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: conn.refresh_token,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!res.ok) {
      return {
        success: false,
        accessToken: conn.access_token,
        error: `Google refresh failed: ${res.status}. Please reconnect.`,
      };
    }

    const data = await res.json();
    const newAccessToken: string = data.access_token;
    const newRefreshToken: string = data.refresh_token ?? conn.refresh_token;
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    await updateConnectionInDB(conn.id, {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expires_at: expiresAt,
    });

    return {
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresAt,
    };
  } catch (err) {
    return {
      success: false,
      accessToken: conn.access_token,
      error: err instanceof Error ? err.message : "Google refresh failed",
    };
  }
}

// ============================================================
// Reddit refresh
// ============================================================

async function refreshReddit(conn: ConnectionRow): Promise<RefreshResult> {
  if (!conn.refresh_token) {
    return {
      success: false,
      accessToken: conn.access_token,
      error: "No refresh token. Please reconnect your Reddit account.",
    };
  }

  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return {
      success: false,
      accessToken: conn.access_token,
      error: "Reddit API credentials not configured.",
    };
  }

  try {
    const res = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: conn.refresh_token,
      }),
    });

    if (!res.ok) {
      return {
        success: false,
        accessToken: conn.access_token,
        error: `Reddit refresh failed: ${res.status}. Please reconnect.`,
      };
    }

    const data = await res.json();
    const newAccessToken: string = data.access_token;

    await updateConnectionInDB(conn.id, {
      access_token: newAccessToken,
      expires_at: null,
    });

    return {
      success: true,
      accessToken: newAccessToken,
      expiresAt: undefined,
    };
  } catch (err) {
    return {
      success: false,
      accessToken: conn.access_token,
      error: err instanceof Error ? err.message : "Reddit refresh failed",
    };
  }
}

// ============================================================
// DB helper
// ============================================================

async function updateConnectionInDB(
  connectionId: string,
  updates: {
    access_token?: string;
    refresh_token?: string;
    expires_at?: string | null;
  }
): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const encryptedUpdates = {
    ...updates,
    access_token: updates.access_token
      ? encryptSecret(updates.access_token)
      : updates.access_token,
    refresh_token: updates.refresh_token
      ? encryptSecret(updates.refresh_token)
      : updates.refresh_token,
  };

  const { error } = await supabase
    .from("platform_connections")
    .update(encryptedUpdates)
    .eq("id", connectionId);

  if (error) {
    console.error(`Failed to update connection ${connectionId}:`, error);
    throw new Error(`DB update failed: ${error.message}`);
  }
}
