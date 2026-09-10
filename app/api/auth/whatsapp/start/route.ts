import { NextResponse } from "next/server";

/**
 * WhatsApp — Uses Meta Business API tokens, not OAuth.
 * Redirect to setup page.
 */
export async function GET() {
  return NextResponse.redirect(
    new URL("/dashboard/connect?whatsapp=setup", process.env.NEXT_PUBLIC_APP_URL)
  );
}
