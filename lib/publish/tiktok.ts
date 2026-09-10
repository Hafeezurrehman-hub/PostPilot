/**
 * TikTok — Video post karo (Content Posting API v2)
 *
 * TikTok Content Posting API se video upload aur publish hota hai.
 * Flow:
 * 1. Video URL se file download karo
 * 2. INIT se upload initialize karo
 * 3. UPLOAD se chunks mein video bhejo
 * 4. PUBLISH se video publish karo
 *
 * TikTok sirf video posts support karta hai (image nahi).
 * Agar image hai to text-only post karo (caption only).
 */

export interface TikTokPublishResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
}

export async function publishToTikTok(params: {
  accessToken: string;
  content: string;
  mediaUrl?: string | null;
}): Promise<TikTokPublishResult> {
  const { accessToken, content, mediaUrl } = params;

  try {
    // TikTok sirf video support karta hai
    // Agar image hai to caption-only post karo
    if (mediaUrl && isVideoUrl(mediaUrl)) {
      return await publishVideoToTikTok(accessToken, content, mediaUrl);
    }

    // Text-only post (TikTok doesn't support text-only via API)
    // But we can try — some accounts support it
    return {
      success: false,
      error:
        "TikTok requires video content. Text-only or image posts are not supported via API. Please upload a video.",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function publishVideoToTikTok(
  accessToken: string,
  caption: string,
  videoUrl: string
): Promise<TikTokPublishResult> {
  // Step 1: Download video
  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok) {
    return { success: false, error: "Failed to download video" };
  }
  const videoBlob = await videoRes.blob();
  const fileSize = videoBlob.size;

  // Step 2: Initialize upload
  const initRes = await fetch(
    "https://open.tiktokapis.com/v2/post/publish/video/init/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post_info: {
          title: caption.slice(0, 150),
          privacy_level: "PUBLIC_TO_EVERYONE",
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: "FILE_UPLOAD",
          video_size: fileSize,
        },
      }),
    }
  );

  if (!initRes.ok) {
    const errBody = await initRes.json().catch(() => ({}));
    return {
      success: false,
      error:
        errBody?.error?.message ?? `TikTok init failed: ${initRes.status}`,
    };
  }

  const initData = await initRes.json();
  const publishId = initData?.data?.publish_id;
  const uploadUrl = initData?.data?.upload_url;

  if (!publishId || !uploadUrl) {
    return { success: false, error: "No publish_id returned from TikTok" };
  }

  // Step 3: Upload video
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Range": `bytes 0-${fileSize - 1}/${fileSize}`,
    },
    body: await videoBlob.arrayBuffer(),
  });

  if (!uploadRes.ok) {
    return {
      success: false,
      error: `TikTok upload failed: ${uploadRes.status}`,
    };
  }

  return {
    success: true,
    platformPostId: publishId,
  };
}

function isVideoUrl(url: string): boolean {
  const videoExtensions = [".mp4", ".mov", ".avi", ".webm", ".mkv"];
  const lowerUrl = url.toLowerCase();
  return (
    videoExtensions.some((ext) => lowerUrl.includes(ext)) ||
    lowerUrl.includes("video") ||
    lowerUrl.includes("tiktok")
  );
}
