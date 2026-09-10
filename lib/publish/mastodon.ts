/**
 * Mastodon — Post karo (Mastodon API v1)
 *
 * Mastodon is a federated social network.
 * Posts are called "toots" (now just "posts").
 * Supports text + media + visibility settings.
 */

export interface MastodonPublishResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
}

export async function publishToMastodon(params: {
  accessToken: string;
  content: string;
  mediaUrl?: string | null;
  instanceUrl?: string;
}): Promise<MastodonPublishResult> {
  const { accessToken, content, mediaUrl } = params;
  const instanceUrl = params.instanceUrl || "https://mastodon.social";

  try {
    let mediaIds: string[] = [];

    // Upload media if present
    if (mediaUrl) {
      const uploadResult = await uploadMastodonMedia(accessToken, mediaUrl, instanceUrl);
      if (uploadResult.error) {
        return { success: false, error: `Media upload failed: ${uploadResult.error}` };
      }
      if (uploadResult.mediaId) {
        mediaIds.push(uploadResult.mediaId);
      }
    }

    // Create post
    const postBody: Record<string, unknown> = {
      status: content,
      visibility: "public",
    };

    if (mediaIds.length > 0) {
      postBody.media_ids = mediaIds;
    }

    const postRes = await fetch(`${instanceUrl}/api/v1/statuses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(postBody),
    });

    if (!postRes.ok) {
      const errBody = await postRes.json().catch(() => ({}));
      return {
        success: false,
        error: errBody?.error ?? `HTTP ${postRes.status}`,
      };
    }

    const postData = await postRes.json();
    return {
      success: true,
      platformPostId: postData.id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function uploadMastodonMedia(
  accessToken: string,
  imageUrl: string,
  instanceUrl: string
): Promise<{ mediaId?: string; error?: string }> {
  try {
    // Download image
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      return { error: "Failed to download image" };
    }
    const imageBlob = await imageRes.blob();

    const formData = new FormData();
    formData.append("file", imageBlob, "image.jpg");

    const uploadRes = await fetch(`${instanceUrl}/api/v2/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    });

    if (!uploadRes.ok) {
      return { error: `Media upload failed: ${uploadRes.status}` };
    }

    const uploadData = await uploadRes.json();
    return { mediaId: uploadData.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Media upload failed" };
  }
}
