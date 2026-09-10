/**
 * Reddit — Post share karo (Reddit API)
 *
 * Reddit pe text/image/link posts hota hai.
 * Agar image hai to image post, nahi to text post.
 */

export interface RedditPublishResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
}

export async function publishToReddit(params: {
  accessToken: string;
  content: string;
  mediaUrl?: string | null;
}): Promise<RedditPublishResult> {
  const { accessToken, content, mediaUrl } = params;

  try {
    // Get user's subreddits to find where to post
    const subsRes = await fetch(
      "https://oauth.reddit.com/subreddits/mine/subscriber?limit=5",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "PostPilot/1.0",
        },
      }
    );

    let subreddit = "self"; // Default to user's profile
    if (subsRes.ok) {
      const subsData = await subsRes.json();
      const subs = subsData.data?.children ?? [];
      if (subs.length > 0) {
        subreddit = subs[0].data.display_name;
      }
    }

    // Create post
    const postBody: Record<string, string> = {
      sr: subreddit,
      title: content.slice(0, 300), // Reddit title limit
      text: content,
      kind: mediaUrl ? "image" : "self",
    };

    if (mediaUrl) {
      postBody.url = mediaUrl;
    }

    const postRes = await fetch(
      "https://oauth.reddit.com/api/submit",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "PostPilot/1.0",
        },
        body: new URLSearchParams(postBody),
      }
    );

    if (!postRes.ok) {
      const errText = await postRes.text();
      return {
        success: false,
        error: `Reddit post failed: ${postRes.status} - ${errText.slice(0, 200)}`,
      };
    }

    const postData = await postRes.json();
    return {
      success: true,
      platformPostId: postData.jquery?.[0]?.data?.name ?? postData.id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
