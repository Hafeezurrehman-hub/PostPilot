/**
 * LinkedIn — post share karo (UGC Posts API)
 *
 * LinkedIn me "ugcPosts" endpoint se post hota hai.
 * Person URN chahiye (authUserInfo se milta hai).
 * Agar image hai to pehle image register karo, phir post me attach karo.
 */

export interface LinkedInPublishResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
}

export async function publishToLinkedIn(params: {
  accessToken: string;
  content: string;
  mediaUrl?: string | null;
}): Promise<LinkedInPublishResult> {
  const { accessToken, content, mediaUrl } = params;

  try {
    // Step 1: Apna person URN nikalo
    const meRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!meRes.ok) {
      return { success: false, error: `Failed to fetch user info: ${meRes.status}` };
    }
    const me = await meRes.json();
    const personUrn = `urn:li:person:${me.sub}`;

    // Step 2: Agar image hai to register karo
    let imageUrl: string | undefined;
    if (mediaUrl) {
      const regResult = await registerLinkedInImage(accessToken, mediaUrl, personUrn);
      if (regResult.error) {
        return { success: false, error: `Image registration failed: ${regResult.error}` };
      }
      imageUrl = regResult.imageUrl;
    }

    // Step 3: Post banao
    const ugcPost: Record<string, unknown> = {
      author: personUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: content },
          shareMediaCategory: imageUrl ? "IMAGE" : "NONE",
          ...(imageUrl
            ? {
                media: [
                  {
                    status: "READY",
                    media: imageUrl,
                  },
                ],
              }
            : {}),
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(ugcPost),
    });

    if (!postRes.ok) {
      const errBody = await postRes.json().catch(() => ({}));
      return {
        success: false,
        error: errBody?.message ?? `HTTP ${postRes.status}`,
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

/**
 * LinkedIn me image register karo (upload ke liye registered image URL chahiye).
 * Ye ek "InitializeUpload" call karta hai, phir image upload karta hai.
 */
async function registerLinkedInImage(
  accessToken: string,
  imageUrl: string,
  ownerUrn: string
): Promise<{ imageUrl?: string; error?: string }> {
  try {
    // Step A: Register upload request
    const registerRes = await fetch(
      "https://api.linkedin.com/v2/assets?action=registerUpload",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
            owner: ownerUrn,
            serviceRelationships: [
              {
                relationshipType: "OWNER",
                identifier: "urn:li:userGeneratedContent",
              },
            ],
          },
        }),
      }
    );

    if (!registerRes.ok) {
      return { error: `Register upload failed: ${registerRes.status}` };
    }

    const regData = await registerRes.json();
    const uploadUrl = regData.value?.uploadMechanism?.[
      "com.linkedin.digitalmediaUpload.MediaUploadHttpRequest"
    ]?.uploadUrl;
    const assetUrn = regData.value?.asset;

    if (!uploadUrl || !assetUrn) {
      return { error: "No upload URL returned from LinkedIn" };
    }

    // Step B: Download image and upload to LinkedIn
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      return { error: "Failed to download image for LinkedIn" };
    }
    const imageBlob = await imageRes.blob();

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/octet-stream",
      },
      body: await imageBlob.arrayBuffer(),
    });

    if (!uploadRes.ok) {
      return { error: `Image upload to LinkedIn failed: ${uploadRes.status}` };
    }

    return { imageUrl: assetUrn };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Image registration failed" };
  }
}
