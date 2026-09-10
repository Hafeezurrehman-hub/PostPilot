/**
 * Pinterest — Pin create karo (API v5)
 *
 * Pinterest pe image + description pin hota hai.
 * Agar image hai to Pin banao, nahi to Text Pin.
 */

export interface PinterestPublishResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
}

export async function publishToPinterest(params: {
  accessToken: string;
  content: string;
  mediaUrl?: string | null;
}): Promise<PinterestPublishResult> {
  const { accessToken, content, mediaUrl } = params;

  try {
    // Get user's boards to find default board
    const boardsRes = await fetch(
      "https://api.pinterest.com/v5/boards?page_size=1",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    let boardId: string | undefined;
    if (boardsRes.ok) {
      const boardsData = await boardsRes.json();
      boardId = boardsData.items?.[0]?.id;
    }

    if (!boardId) {
      // Create a default board
      const createBoardRes = await fetch(
        "https://api.pinterest.com/v5/boards",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "PostPilot Pins",
            description: "Pins created via PostPilot",
          }),
        }
      );

      if (createBoardRes.ok) {
        const newBoard = await createBoardRes.json();
        boardId = newBoard.id;
      }
    }

    if (!boardId) {
      return {
        success: false,
        error: "Failed to find or create a Pinterest board",
      };
    }

    // Create Pin
    const pinBody: Record<string, unknown> = {
      board_id: boardId,
      title: content.slice(0, 100),
      description: content,
    };

    if (mediaUrl) {
      // Pinterest needs image_url for pins
      pinBody.media_source = {
        source_type: "image_url",
        url: mediaUrl,
      };
    } else {
      // Idea Pin (text-only) — Pinterest supports this
      return {
        success: false,
        error: "Pinterest requires an image. Please add an image to your post.",
      };
    }

    const pinRes = await fetch("https://api.pinterest.com/v5/pins", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pinBody),
    });

    if (!pinRes.ok) {
      const errBody = await pinRes.json().catch(() => ({}));
      return {
        success: false,
        error:
          errBody?.message ?? `Pinterest pin failed: ${pinRes.status}`,
      };
    }

    const pinData = await pinRes.json();
    return {
      success: true,
      platformPostId: pinData.id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
