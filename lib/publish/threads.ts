/**
 * Threads — Post karo (Instagram Graph API)
 *
 * Threads API is part of Instagram Graph API.
 * Same two-step process as Instagram:
 * 1. Create media container
 * 2. Publish container
 *
 * Threads supports text + image posts (no video yet via API).
 */

export interface ThreadsPublishResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
}

export async function publishToThreads(params: {
  accessToken: string;
  content: string;
  mediaUrl?: string | null;
}): Promise<ThreadsPublishResult> {
  const { accessToken, content, mediaUrl } = params;

  try {
    // Get Instagram Business Account ID (needed for Threads API)
    const igAccountId = await getInstagramAccountId(accessToken);
    if (!igAccountId) {
      return {
        success: false,
        error:
          "No linked Instagram Business account found. Threads requires an Instagram Business/Creator account.",
      };
    }

    // Create media container
    const containerBody: Record<string, string> = {
      text: content,
    };

    if (mediaUrl) {
      containerBody.image_url = mediaUrl;
    }

    const containerRes = await fetch(
      `https://graph.facebook.com/v21.0/${igAccountId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...containerBody,
          access_token: accessToken,
        }),
      }
    );

    if (!containerRes.ok) {
      const errBody = await containerRes.json().catch(() => ({}));
      return {
        success: false,
        error:
          errBody?.error?.message ??
          `Container creation failed: HTTP ${containerRes.status}`,
      };
    }

    const containerData = await containerRes.json();
    const containerId = containerData.id;

    // Publish container
    const publishRes = await fetch(
      `https://graph.facebook.com/v21.0/${igAccountId}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: accessToken,
        }),
      }
    );

    if (!publishRes.ok) {
      const errBody = await publishRes.json().catch(() => ({}));
      return {
        success: false,
        error:
          errBody?.error?.message ??
          `Publish failed: HTTP ${publishRes.status}`,
      };
    }

    const publishData = await publishRes.json();
    return {
      success: true,
      platformPostId: publishData.id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function getInstagramAccountId(
  accessToken: string
): Promise<string | null> {
  try {
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}`
    );
    if (!pagesRes.ok) return null;

    const pagesData = await pagesRes.json();
    const pages = pagesData.data ?? [];

    for (const page of pages) {
      const igRes = await fetch(
        `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`
      );
      if (igRes.ok) {
        const igData = await igRes.json();
        const igId = igData?.instagram_business_account?.id;
        if (igId) return igId;
      }
    }
    return null;
  } catch {
    return null;
  }
}
