/**
 * GET /api/l/[code]
 *
 * Short link redirect — click track karo aur original URL pe redirect karo.
 */

import { NextRequest, NextResponse } from "next/server";
import { trackClick } from "@/lib/links";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const originalUrl = await trackClick(code);

  if (!originalUrl) {
    return NextResponse.redirect(new URL("/not-found", _request.url));
  }

  return NextResponse.redirect(originalUrl);
}
