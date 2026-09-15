/**
 * WhatsApp — Broadcast to a contact list via WhatsApp Business Cloud API.
 *
 * IMPORTANT: WhatsApp does not expose any public API for posting to a
 * personal "Status" or to Meta's newer "Channels" feature — Meta hasn't
 * opened that up to third-party developers. This implementation instead
 * broadcasts a text/media message to a list of recipient numbers the user
 * configures (e.g. their customer/audience list) — the closest real,
 * working equivalent to "posting to everyone at once" using the official
 * WhatsApp Business Platform.
 *
 * `recipients` should be E.164-style numbers without the leading '+'
 * (e.g. "923001234567"), stored as a JSON array in
 * platform_connections.external_id.
 */

export interface WhatsAppPublishResult {
  success: boolean;
  platformPostId?: string;
  error?: string;
  perRecipient?: Array<{ to: string; success: boolean; error?: string }>;
}

export async function publishToWhatsApp(params: {
  accessToken: string;
  content: string;
  mediaUrl?: string | null;
  phoneNumberId?: string;
  recipients: string[];
}): Promise<WhatsAppPublishResult> {
  const { accessToken, content, mediaUrl, recipients } = params;
  const phoneNumberId = params.phoneNumberId || process.env.WHATSAPP_BUSINESS_PHONE_ID;

  if (!phoneNumberId) {
    return {
      success: false,
      error: "WhatsApp Business Phone ID is not configured. Set WHATSAPP_BUSINESS_PHONE_ID in .env.local",
    };
  }

  if (!recipients || recipients.length === 0) {
    return {
      success: false,
      error: "No recipients configured for this WhatsApp connection.",
    };
  }

  let mediaId: string | null = null;
  if (mediaUrl) {
    const mediaType = getMediaType(mediaUrl);
    const uploadRes = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ messaging_product: "whatsapp", url: mediaUrl, type: mediaType }),
      }
    );
    if (uploadRes.ok) {
      const uploadData = await uploadRes.json();
      mediaId = uploadData.id;
    }
    // If media upload fails, we still try to send as text below rather than failing the whole broadcast
  }

  const perRecipient: Array<{ to: string; success: boolean; error?: string }> = [];

  for (const to of recipients) {
    try {
      const mediaType = mediaUrl ? getMediaType(mediaUrl) : null;
      const body = mediaId && mediaType
        ? {
            messaging_product: "whatsapp",
            to,
            type: mediaType,
            [mediaType]: { id: mediaId, caption: content },
          }
        : {
            messaging_product: "whatsapp",
            to,
            type: "text",
            text: { body: content },
          };

      const res = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        perRecipient.push({ to, success: false, error: errBody?.error?.message ?? `HTTP ${res.status}` });
        continue;
      }

      perRecipient.push({ to, success: true });
    } catch (err) {
      perRecipient.push({ to, success: false, error: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  const successCount = perRecipient.filter(r => r.success).length;
  return {
    success: successCount > 0,
    platformPostId: successCount > 0 ? `broadcast-${Date.now()}` : undefined,
    error: successCount === 0 ? "Failed to reach any recipient" : undefined,
    perRecipient,
  };
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
