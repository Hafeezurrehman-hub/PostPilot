/**
 * Instagram — post karo (Graph API — two-step process)
 *
 * Instagram me posting ek do-step process hai:
 * 1. Pehle ek "media container" banao (image URL + caption)
 * 2. Phir us container ko publish karo
 *
 * Ye sirf Instagram Business/Creator accounts ke liye kaam karta hai
 * (Meta ki requirement).
 * Instagram account ek Facebook Page se linked hona chahiye.
 */

export interface InstagramPublishResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
}

export async function publishToInstagram(params: {
  accessToken: string;
  content: string;
  mediaUrl?: string | null;
}): Promise<InstagramPublishResult> {
  const { accessToken, content, mediaUrl } = params;

  try {
    // Step 1: Instagram Business Account ID nikalo
    const igAccountId = await getInstagramAccountId(accessToken);
    if (!igAccountId) {
      return {
        success: false,
        error:
          "No linked Instagram Business account found. Make sure your Instagram is a Business/Creator account linked to a Facebook Page.",
      };
    }

    // Step 2: Agar image hai to container with image, nahi to container with caption only
    if (!mediaUrl) {
      return {
        success: false,
        error: "Instagram requires an image for posts. Text-only posts are not supported via API.",
      };
    }

    // Create media container
    const containerRes = await fetch(
      `https://graph.facebook.com/v21.0/${igAccountId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: mediaUrl,
          caption: content,
          access_token: accessToken,
        }),
      }
    );

    if (!containerRes.ok) {
      const errBody = await containerRes.json().catch(() => ({}));
      return {
        success: false,
        error: errBody?.error?.message ?? `Container creation failed: HTTP ${containerRes.status}`,
      };
    }

    const containerData = await containerRes.json();
    const containerId = containerData.id;

    // Step 3: Container ko publish karo
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
        error: errBody?.error?.message ?? `Publish failed: HTTP ${publishRes.status}`,
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

/**
 * Facebook Pages ke through Instagram Business Account ID nikalo.
 */
async function getInstagramAccountId(accessToken: string): Promise<string | null> {
  try {
    // Pehle pages nikalo
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}`
    );
    if (!pagesRes.ok) return null;

    const pagesData = await pagesRes.json();
    const pages = pagesData.data ?? [];

    // Har page ke liye check karo ki usse linked IG account hai ya nahi
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
