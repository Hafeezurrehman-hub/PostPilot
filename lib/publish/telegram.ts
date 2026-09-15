/**
 * Telegram publisher.
 *
 * Unlike OAuth platforms, `accessToken` here is actually the Bot Token
 * (from @BotFather), and `chatId` is the channel/group the bot has been
 * made an admin of. Both come from platform_connections
 * (access_token = bot token, external_id = chat id).
 */

type PublishParams = {
  accessToken: string // bot token
  chatId: string
  content: string
  mediaUrl?: string | null
  mediaType?: string | null // 'image' | 'video'
}

type PublishResult = {
  success: boolean
  platformPostId?: string
  error?: string
}

export async function publishToTelegram({
  accessToken,
  chatId,
  content,
  mediaUrl,
  mediaType,
}: PublishParams): Promise<PublishResult> {
  if (!accessToken || !chatId) {
    return { success: false, error: "Telegram bot token or chat ID missing" }
  }

  const base = `https://api.telegram.org/bot${accessToken}`

  try {
    let res: Response

    if (mediaUrl && mediaType === "video") {
      res = await fetch(`${base}/sendVideo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, video: mediaUrl, caption: content }),
      })
    } else if (mediaUrl) {
      res = await fetch(`${base}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, photo: mediaUrl, caption: content }),
      })
    } else {
      res = await fetch(`${base}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: content }),
      })
    }

    const data = await res.json()

    if (!data.ok) {
      return { success: false, error: data.description || "Telegram API error" }
    }

    return { success: true, platformPostId: String(data.result?.message_id ?? "") }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Telegram request failed" }
  }
}

/**
 * Verifies a bot token is valid and returns the bot's username —
 * used by the Connect flow before saving the connection.
 */
export async function verifyTelegramBot(botToken: string): Promise<{ valid: boolean; username?: string; error?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
    const data = await res.json()
    if (!data.ok) {
      return { valid: false, error: data.description || "Invalid bot token" }
    }
    return { valid: true, username: data.result?.username }
  } catch {
    return { valid: false, error: "Could not reach Telegram API" }
  }
}
