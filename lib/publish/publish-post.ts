/**
 * Publish orchestrator — ek post ko selected platforms pe publish karta hai.
 *
 * Flow:
 * 1. Post ke platforms ke hisaab se sahi publisher call karo
 * 2. Har platform ka result track karo (success / failed)
 * 3. Database me post_results insert karo
 * 4. Post ka status update karo (published / failed)
 */

import { createClient } from "@supabase/supabase-js";
import { decryptSecret } from "@/lib/crypto/tokens";
import { publishToTwitter } from "./twitter";
import { publishToLinkedIn } from "./linkedin";
import { publishToFacebook } from "./facebook";
import { publishToInstagram } from "./instagram";
import { publishToTikTok } from "./tiktok";
import { publishToThreads } from "./threads";
import { publishToYouTube } from "./youtube";
import { publishToPinterest } from "./pinterest";
import { publishToReddit } from "./reddit";
import { publishToMastodon } from "./mastodon";
import { publishToBluesky } from "./bluesky";
import { publishToGoogleBusiness } from "./google-business";
import { publishToWhatsApp } from "./whatsapp";
import { publishToTelegram } from "./telegram";
import { isTokenExpired, ensureValidToken } from "./refresh-token";

export interface PublishOutcome {
  platform: string;
  status: "success" | "failed";
  platformPostId?: string;
  error?: string;
}

/**
 * Ek post ko uske saare selected platforms pe publish karo.
 * Supabase admin client use karo (server-side, RLS bypass).
 */
export async function publishPost(postId: string): Promise<PublishOutcome[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Post data nikalo
  const { data: post, error: postErr } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .single();

  if (postErr || !post) {
    throw new Error(`Post not found: ${postErr?.message ?? "unknown"}`);
  }

  // 2. User ki platform connections nikalo
  const { data: connections, error: connErr } = await supabase
    .from("platform_connections")
    .select("*")
    .eq("user_id", post.user_id);

  if (connErr) {
    throw new Error(`Failed to fetch connections: ${connErr.message}`);
  }

  const outcomes: PublishOutcome[] = [];

  if (!post.platforms?.length) {
    await supabase.from("posts").update({ status: "failed" }).eq("id", postId);
    return [
      {
        platform: "none",
        status: "failed",
        error: "No platforms selected",
      },
    ];
  }

  for (const platform of post.platforms) {
    const conn = connections?.find((c) => c.platform === platform);
    if (!conn) {
      outcomes.push({
        platform,
        status: "failed",
        error: "Platform not connected",
      });
      continue;
    }

    const decryptedConn = {
      ...conn,
      access_token: decryptSecret(conn.access_token) ?? "",
      refresh_token: decryptSecret(conn.refresh_token),
    };

    let accessToken = decryptedConn.access_token;

    // Telegram uses a static Bot Token, not an OAuth token — no refresh needed
    if (platform !== "telegram") {
      try {
        accessToken = await ensureValidToken(decryptedConn);
      } catch {
        // Refresh failed — continue with old token, publish will likely fail
      }

      // Agar token expired hai aur refresh bhi fail hai, to error de do
      if (isTokenExpired(decryptedConn) && accessToken === decryptedConn.access_token) {
        outcomes.push({
          platform,
          status: "failed",
          error: "Access token expired. Please reconnect this platform.",
        });
        continue;
      }
    }

    let result;
    switch (platform) {
      case "twitter":
        result = await publishToTwitter({
          accessToken,
          content: post.content,
          mediaUrl: post.media_url,
        });
        break;
      case "linkedin":
        result = await publishToLinkedIn({
          accessToken,
          content: post.content,
          mediaUrl: post.media_url,
        });
        break;
      case "facebook":
        result = await publishToFacebook({
          accessToken,
          content: post.content,
          mediaUrl: post.media_url,
        });
        break;
      case "instagram":
        result = await publishToInstagram({
          accessToken,
          content: post.content,
          mediaUrl: post.media_url,
        });
        break;
      case "tiktok":
        result = await publishToTikTok({
          accessToken,
          content: post.content,
          mediaUrl: post.media_url,
        });
        break;
      case "threads":
        result = await publishToThreads({
          accessToken,
          content: post.content,
          mediaUrl: post.media_url,
        });
        break;
      case "youtube":
        result = await publishToYouTube({
          accessToken,
          content: post.content,
          mediaUrl: post.media_url,
        });
        break;
      case "pinterest":
        result = await publishToPinterest({
          accessToken,
          content: post.content,
          mediaUrl: post.media_url,
        });
        break;
      case "reddit":
        result = await publishToReddit({
          accessToken,
          content: post.content,
          mediaUrl: post.media_url,
        });
        break;
      case "mastodon":
        result = await publishToMastodon({
          accessToken,
          content: post.content,
          mediaUrl: post.media_url,
        });
        break;
      case "bluesky":
        result = await publishToBluesky({
          accessToken,
          content: post.content,
          mediaUrl: post.media_url,
        });
        break;
      case "google_business":
        result = await publishToGoogleBusiness({
          accessToken,
          content: post.content,
          mediaUrl: post.media_url,
        });
        break;
      case "whatsapp": {
        let recipients: string[] = [];
        try {
          recipients = JSON.parse(decryptedConn.external_id || "[]");
        } catch {
          recipients = [];
        }
        result = await publishToWhatsApp({
          accessToken,
          content: post.content,
          mediaUrl: post.media_url,
          recipients,
        });
        break;
      }
      case "telegram":
        result = await publishToTelegram({
          accessToken,
          chatId: decryptedConn.external_id ?? "",
          content: post.content,
          mediaUrl: post.media_url,
          mediaType: post.media_type,
        });
        break;
      default:
        result = { success: false, error: `Unknown platform: ${platform}` };
    }

    // 4. Result DB me save karo
    await supabase.from("post_results").insert({
      post_id: postId,
      platform,
      status: result.success ? "success" : "failed",
      platform_post_id: result.platformPostId ?? null,
      error_message: result.error ?? null,
      attempted_at: new Date().toISOString(),
    });

    outcomes.push({
      platform,
      status: result.success ? "success" : "failed",
      platformPostId: result.platformPostId,
      error: result.error,
    });
  }

  const anySuccess = outcomes.some((o) => o.status === "success");
  await supabase
    .from("posts")
    .update(
      anySuccess
        ? { status: "published", published_at: new Date().toISOString() }
        : { status: "failed" }
    )
    .eq("id", postId);

  // Notify the user via the bell icon
  try {
    const platformList = outcomes.map((o) => o.platform).join(", ");
    if (anySuccess) {
      await supabase.from("notifications").insert({
        user_id: post.user_id,
        title: "Post published",
        message: `Your post went live on ${platformList}.`,
        type: "success",
      });
    } else {
      const firstError = outcomes[0]?.error ?? "Unknown error";
      await supabase.from("notifications").insert({
        user_id: post.user_id,
        title: "Post failed to publish",
        message: firstError,
        type: "error",
      });
    }
  } catch (err) {
    console.error("Publish: Could not create notification:", err);
  }

  return outcomes;
}
