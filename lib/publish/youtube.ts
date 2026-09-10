/**
 * YouTube — Video upload karo (Data API v3)
 *
 * YouTube pe video upload ek resumable upload process hai:
 * 1. Video metadata + resumable upload URL initialize karo
 * 2. Video file upload karo
 * 3. Upload complete karo
 *
 * YouTube sirf video support karta hai.
 * Agar image hai to YouTube Community Post (text + image) use karo.
 */

export interface YouTubePublishResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
}

export async function publishToYouTube(params: {
  accessToken: string;
  content: string;
  mediaUrl?: string | null;
}): Promise<YouTubePublishResult> {
  const { accessToken, content, mediaUrl } = params;

  try {
    if (mediaUrl && isVideoUrl(mediaUrl)) {
      return await uploadVideoToYouTube(accessToken, content, mediaUrl);
    }

    // Community post (text + image) — not a video
    if (mediaUrl) {
      return await createCommunityPost(accessToken, content, mediaUrl);
    }

    // Text-only community post
    return await createCommunityPost(accessToken, content);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function uploadVideoToYouTube(
  accessToken: string,
  title: string,
  videoUrl: string
): Promise<YouTubePublishResult> {
  // Download video
  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok) {
    return { success: false, error: "Failed to download video" };
  }
  const videoBlob = await videoRes.blob();

  // Initialize resumable upload
  const initRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": videoBlob.type || "video/mp4",
        "X-Upload-Content-Length": videoBlob.size.toString(),
      },
      body: JSON.stringify({
        snippet: {
          title: title.slice(0, 100),
          description: title,
        },
        status: {
          privacyStatus: "public",
          selfDeclaredMadeForKids: false,
        },
      }),
    }
  );

  if (!initRes.ok) {
    const errBody = await initRes.json().catch(() => ({}));
    return {
      success: false,
      error:
        errBody?.error?.message ?? `YouTube init failed: ${initRes.status}`,
    };
  }

  const uploadUrl = initRes.headers.get("Location");
  if (!uploadUrl) {
    return { success: false, error: "No upload URL returned from YouTube" };
  }

  // Upload video
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": videoBlob.type || "video/mp4",
    },
    body: await videoBlob.arrayBuffer(),
  });

  if (!uploadRes.ok) {
    return {
      success: false,
      error: `YouTube upload failed: ${uploadRes.status}`,
    };
  }

  const uploadData = await uploadRes.json();
  return {
    success: true,
    platformPostId: uploadData.id,
  };
}

async function createCommunityPost(
  accessToken: string,
  text: string,
  imageUrl?: string
): Promise<YouTubePublishResult> {
  // YouTube Community Tab API
  // This requires YouTube Analytics API scope
  try {
    const body: Record<string, unknown> = {
      snippet: {
        type: "text",
        textSnippet: text,
      },
    };

    if (imageUrl) {
      // Download image
      const imgRes = await fetch(imageUrl);
      if (imgRes.ok) {
        const imgBlob = await imgRes.blob();
        const base64 = await blobToBase64(imgBlob);

        body.snippet = {
          type: "image",
          textSnippet: text,
          image: {
            url: imageUrl,
          },
        };
      }
    }

    // YouTube Community API endpoint
    const res = await fetch(
      "https://youtube.googleapis.com/youtube/v3/commentThreads?part=snippet",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      return {
        success: false,
        error: `YouTube community post failed: ${res.status}. Note: Community posts require YouTube Partner status.`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      platformPostId: data.id,
    };
  } catch {
    return {
      success: false,
      error: "YouTube community posts require YouTube Partner status. Please upload a video instead.",
    };
  }
}

function isVideoUrl(url: string): boolean {
  const videoExtensions = [".mp4", ".mov", ".avi", ".webm", ".mkv"];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some((ext) => lowerUrl.includes(ext));
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
