/**
 * Facebook — post/page feed pe share karo (Graph API)
 *
 * Facebook me posting Page access_token se hoti hai (user token se nahi).
 * Humara connect flow already page access_token save karta hai.
 * Agar image hai to /photos endpoint use karo, nahi to /feed.
 */

export interface FacebookPublishResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
}

export async function publishToFacebook(params: {
  accessToken: string;
  content: string;
  mediaUrl?: string | null;
  pageId?: string;
}): Promise<FacebookPublishResult> {
  const { accessToken, content, mediaUrl } = params;

  try {
    // Pehle page ID nikalo (agar store nahi hai to API se)
    let pageId = params.pageId;
    if (!pageId) {
      const pagesRes = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}`
      );
      if (pagesRes.ok) {
        const pagesData = await pagesRes.json();
        pageId = pagesData.data?.[0]?.id;
      }
    }

    if (!pageId) {
      return { success: false, error: "No Facebook Page found for this account" };
    }

    let postId: string | undefined;

    if (mediaUrl) {
      // Photo post — image ke saath
      const photoRes = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/photos`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: mediaUrl,
            message: content,
            access_token: accessToken,
          }),
        }
      );

      if (!photoRes.ok) {
        const errBody = await photoRes.json().catch(() => ({}));
        return {
          success: false,
          error: errBody?.error?.message ?? `HTTP ${photoRes.status}`,
        };
      }

      const photoData = await photoRes.json();
      postId = photoData.id;
    } else {
      // Text-only feed post
      const feedRes = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/feed`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            access_token: accessToken,
          }),
        }
      );

      if (!feedRes.ok) {
        const errBody = await feedRes.json().catch(() => ({}));
        return {
          success: false,
          error: errBody?.error?.message ?? `HTTP ${feedRes.status}`,
        };
      }

      const feedData = await feedRes.json();
      postId = feedData.id;
    }

    return {
      success: true,
      platformPostId: postId,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
