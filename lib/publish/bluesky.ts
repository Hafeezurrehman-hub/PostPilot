/**
 * Bluesky — Post karo (AT Protocol)
 *
 * Bluesky uses AT Protocol (formerly known as adX).
 * Authentication is via app passwords (not OAuth).
 * User enters their handle + app password in settings.
 */

export interface BlueskyPublishResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
}

export async function publishToBluesky(params: {
  accessToken: string; // Actually the app password
  content: string;
  mediaUrl?: string | null;
  handle?: string;
}): Promise<BlueskyPublishResult> {
  const { content, mediaUrl } = params;
  const handle = params.handle;

  if (!handle) {
    return {
      success: false,
      error: "Bluesky handle is required. Please set your Bluesky handle in settings.",
    };
  }

  try {
    // Resolve DID from handle
    const resolveRes = await fetch(
      `https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${handle}`
    );

    if (!resolveRes.ok) {
      return {
        success: false,
        error: `Failed to resolve Bluesky handle: ${resolveRes.status}`,
      };
    }

    const resolveData = await resolveRes.json();
    const did = resolveData.did;

    // Login to get session token
    const loginRes = await fetch(
      "https://bsky.social/xrpc/com.atproto.server.createSession",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: handle,
          password: params.accessToken, // App password
        }),
      }
    );

    if (!loginRes.ok) {
      return {
        success: false,
        error: "Bluesky login failed. Please check your app password.",
      };
    }

    const loginData = await loginRes.json();
    const sessionToken = loginData.accessJwt;

    // Create record
    const record: Record<string, unknown> = {
      $type: "app.bsky.feed.post",
      text: content,
      createdAt: new Date().toISOString(),
    };

    // Upload media if present
    if (mediaUrl) {
      const imageRes = await fetch(mediaUrl);
      if (imageRes.ok) {
        const imageBlob = await imageRes.blob();
        const formData = new FormData();
        formData.append("file", imageBlob, "image.jpg");
        formData.append("did", did);

        const uploadRes = await fetch(
          "https://bsky.social/xrpc/com.atproto.repo.uploadBlob",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${sessionToken}` },
            body: formData,
          }
        );

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          record.embed = {
            $type: "app.bsky.embed.images",
            images: [
              {
                alt: "Post image",
                image: uploadData.blob,
              },
            ],
          };
        }
      }
    }

    // Create post
    const postRes = await fetch(
      "https://bsky.social/xrpc/com.atproto.repo.createRecord",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repo: did,
          collection: "app.bsky.feed.post",
          record,
        }),
      }
    );

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
      platformPostId: postData.uri,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
