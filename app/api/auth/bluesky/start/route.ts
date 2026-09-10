import { NextResponse } from "next/server";

/**
 * Bluesky — Uses app passwords, not OAuth.
 * Redirect to a settings page where user enters handle + app password.
 */
export async function GET() {
  return NextResponse.redirect(
    new URL("/dashboard/connect?bluesky=setup", process.env.NEXT_PUBLIC_APP_URL)
  );
}
