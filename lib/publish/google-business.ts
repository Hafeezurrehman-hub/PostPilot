/**
 * Google Business — Post karo (Google My Business API)
 *
 * Google Business Profile posts appear in Google Search and Maps.
 * Uses Google OAuth (same as YouTube).
 * Supports text + image + CTA button posts.
 */

export interface GoogleBusinessPublishResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
}

export async function publishToGoogleBusiness(params: {
  accessToken: string;
  content: string;
  mediaUrl?: string | null;
}): Promise<GoogleBusinessPublishResult> {
  const { accessToken, content, mediaUrl } = params;

  try {
    // Get user's business locations
    const locationsRes = await fetch(
      "https://mybusinessbusinessinformation.googleapis.com/v1/locations?readMask=name,title",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!locationsRes.ok) {
      return {
        success: false,
        error: `Failed to fetch business locations: ${locationsRes.status}. Make sure you have a Google Business Profile.`,
      };
    }

    const locationsData = await locationsRes.json();
    const locations = locationsData.locations ?? [];

    if (locations.length === 0) {
      return {
        success: false,
        error: "No Google Business Profile found. Please create one first.",
      };
    }

    const locationId = locations[0].name;

    // Create local post
    const postBody: Record<string, unknown> = {
      languageCode: "en",
      summary: content,
      topicType: "STANDARD",
    };

    if (mediaUrl) {
      postBody.media = [
        {
          mediaUrl,
          mediaFormat: "PHOTO",
        },
      ];
    }

    const postRes = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${locationId}/localPosts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postBody),
      }
    );

    if (!postRes.ok) {
      const errBody = await postRes.json().catch(() => ({}));
      return {
        success: false,
        error:
          errBody?.error?.message ??
          `Google Business post failed: ${postRes.status}`,
      };
    }

    const postData = await postRes.json();
    return {
      success: true,
      platformPostId: postData.name,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
