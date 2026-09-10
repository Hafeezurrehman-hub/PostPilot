/**
 * Twitter/X — tweet post karo (API v2)
 *
 * Agar image hai to pehle media upload karo, phir tweet banao with media_id.
 * Agar text only hai to seedha tweet banao.
 */

export interface TwitterPublishResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
}

export async function publishToTwitter(params: {
  accessToken: string;
  content: string;
  mediaUrl?: string | null;
}): Promise<TwitterPublishResult> {
  const { accessToken, content, mediaUrl } = params;

  try {
    let mediaIds: string[] = [];

    // Step 1: Agar image hai to pehle upload karo
    if (mediaUrl) {
      const uploadResult = await uploadTwitterMedia(accessToken, mediaUrl);
      if (uploadResult.error) {
        return { success: false, error: `Media upload failed: ${uploadResult.error}` };
      }
      if (uploadResult.mediaId) {
        mediaIds.push(uploadResult.mediaId);
      }
    }

    // Step 2: Tweet banao
    const tweetBody: Record<string, unknown> = { text: content };
    if (mediaIds.length > 0) {
      tweetBody.media = { media_ids: mediaIds };
    }

    const res = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(tweetBody),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const errMsg =
        errBody?.errors?.[0]?.message ?? `HTTP ${res.status}`;
      return { success: false, error: errMsg };
    }

    const data = await res.json();
    return {
      success: true,
      platformPostId: data?.data?.id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Twitter media upload (v1.1 chunked upload endpoint — still required for images)
 * Returns media_id_string for attaching to a tweet.
 */
async function uploadTwitterMedia(
  accessToken: string,
  imageUrl: string
): Promise<{ mediaId?: string; error?: string }> {
  try {
    // Download image from URL
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      return { error: "Failed to download image" };
    }
    const imageBlob = await imageRes.blob();

    const formData = new FormData();
    formData.append("command", "INIT");
    formData.append("total_bytes", imageBlob.size.toString());
    formData.append("media_type", imageBlob.type || "image/jpeg");
    formData.append("media_category", "tweet_image");

    // INIT
    const initRes = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    });
    if (!initRes.ok) {
      return { error: `Media INIT failed: ${initRes.status}` };
    }
    const initData = await initRes.json();
    const mediaId = initData.media_id_string;

    // APPEND — send the actual bytes
    const appendForm = new FormData();
    appendForm.append("command", "APPEND");
    appendForm.append("media_id", mediaId);
    appendForm.append("segment_index", "0");
    appendForm.append("media_data", await blobToBase64(imageBlob));

    const appendRes = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: appendForm,
    });
    if (!appendRes.ok) {
      return { error: `Media APPEND failed: ${appendRes.status}` };
    }

    // FINALIZE
    const finalForm = new FormData();
    finalForm.append("command", "FINALIZE");
    finalForm.append("media_id", mediaId);

    const finalRes = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: finalForm,
    });
    if (!finalRes.ok) {
      return { error: `Media FINALIZE failed: ${finalRes.status}` };
    }

    return { mediaId };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Media upload failed" };
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // strip data:image/...;base64, prefix
      const base64 = result.split(",")[1] ?? result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
