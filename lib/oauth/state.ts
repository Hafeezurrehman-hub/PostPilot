import { randomBytes } from "crypto";

/**
 * OAuth flow me "state" ek random string hota hai jo hum platform ko bhejte hain,
 * aur wo callback me wapas bhejta hai — isse hum confirm karte hain ke request
 * wahi user ne shuru ki thi jo humne bheji thi (CSRF attack se bachne ke liye).
 * Ise cookie me store karte hain, callback me match karte hain.
 */
export function generateState() {
  return randomBytes(16).toString("hex");
}
