/**
 * WhatsApp — Status/Image Share karo (Meta Business API)
 *
 * WhatsApp Status is not directly supported via API.
 * Instead, we use WhatsApp Business API to send messages
 * to the user's own number or a designated contact.
 *
 * Alternative: WhatsApp Cloud API for business messaging.
 * This can send text + media messages.
 *
 * Note: WhatsApp Status posting is not officially supported.
 * This implementation sends a WhatsApp message instead.
 */

export interface WhatsAppPublishResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
}

export async function publishToWhatsApp(params: {
  accessToken: string;
  content: string;
  mediaUrl?: string | null;
  phoneNumberId?: string;
}): Promise<WhatsAppPublishResult> {
  const { accessToken, content, mediaUrl } = params;
  const phoneNumberId = params.phoneNumberId || process.env.WHATSAPP_BUSINESS_PHONE_ID;

  if (!phoneNumberId) {
    return {
      success: false,
      error: "WhatsApp Business Phone ID is not configured. Set WHATSAPP_BUSINESS_PHONE_ID in .env.local",
    };
  }

  try {
    if (mediaUrl) {
      // Send media message
      const mediaType = getMediaType(mediaUrl);

      // Upload media first
      const uploadRes = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            url: mediaUrl,
            type: mediaType,
          }),
        }
      );

      if (!uploadRes.ok) {
        const errBody = await uploadRes.json().catch(() => ({}));
        return {
          success: false,
          error: `WhatsApp media upload failed: ${errBody?.error?.message ?? uploadRes.status}`,
        };
      }

      const uploadData = await uploadRes.json();
      const mediaId = uploadData.id;

      // Send media message
      const sendRes = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: phoneNumberId, // Send to self
            type: mediaType,
            [mediaType]: {
              id: mediaId,
              caption: content,
            },
          }),
        }
      );

      if (!sendRes.ok) {
        const errBody = await sendRes.json().catch(() => ({}));
        return {
          success: false,
          error: `WhatsApp send failed: ${errBody?.error?.message ?? sendRes.status}`,
        };
      }

      const sendData = await sendRes.json();
      return {
        success: true,
        platformPostId: sendData.messages?.[0]?.id,
      };
    } else {
      // Send text message
      const sendRes = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: phoneNumberId, // Send to self
            type: "text",
            text: {
              body: content,
            },
          }),
        }
      );

      if (!sendRes.ok) {
        const errBody = await sendRes.json().catch(() => ({}));
        return {
          success: false,
          error: `WhatsApp send failed: ${errBody?.error?.message ?? sendRes.status}`,
        };
      }

      const sendData = await sendRes.json();
      return {
        success: true,
        platformPostId: sendData.messages?.[0]?.id,
      };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

function getMediaType(url: string): "image" | "video" | "audio" | "document" {
  const lower = url.toLowerCase();
  if (lower.includes("video") || lower.endsWith(".mp4") || lower.endsWith(".mov")) {
    return "video";
  }
  if (lower.includes("audio") || lower.endsWith(".mp3") || lower.endsWith(".wav")) {
    return "audio";
  }
  return "image";
}
