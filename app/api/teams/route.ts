/**
 * GET    /api/teams       — User ki teams list karo
 * POST   /api/teams       — Naya team create karo
 * PATCH  /api/teams       — Team update / member manage karo
 * DELETE /api/teams       — Team delete karo
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  getUserTeams,
  createTeam,
  inviteMember,
  removeMember,
  acceptInvitation,
} from "@/lib/teams";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );
}

export async function GET() {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const teams = await getUserTeams(user.id);
    return NextResponse.json({ teams });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    action?: string;
    name?: string;
    teamId?: string;
    memberId?: string;
    email?: string;
    role?: string;
    token?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    switch (body.action) {
      case "create": {
        if (!body.name) {
          return NextResponse.json({ error: "name is required" }, { status: 400 });
        }
        const team = await createTeam(body.name, user.id);
        return NextResponse.json({ team });
      }

      case "invite": {
        if (!body.teamId || !body.email) {
          return NextResponse.json(
            { error: "teamId and email are required" },
            { status: 400 }
          );
        }
        const invitation = await inviteMember(
          body.teamId,
          body.email,
          (body.role as "admin" | "member") ?? "member",
          user.id
        );
        return NextResponse.json({ invitation });
      }

      case "accept_invitation": {
        if (!body.token) {
          return NextResponse.json({ error: "token is required" }, { status: 400 });
        }
        await acceptInvitation(body.token, user.id);
        return NextResponse.json({ success: true });
      }

      case "remove_member": {
        if (!body.teamId || !body.memberId) {
          return NextResponse.json(
            { error: "teamId and memberId are required" },
            { status: 400 }
          );
        }
        await removeMember(body.teamId, body.memberId, user.id);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Operation failed" },
      { status: 500 }
    );
  }
}
