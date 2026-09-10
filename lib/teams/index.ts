/**
 * Teams — Collaboration support.
 *
 * Teams allow multiple users to collaborate on posts.
 * Owner can invite members via email.
 * Members can view, create, and publish posts within their team.
 */

import { createClient } from "@supabase/supabase-js";

export interface Team {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
  // Joined data
  email?: string;
  full_name?: string;
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  role: "admin" | "member";
  invited_by: string;
  token: string;
  accepted: boolean;
  expires_at: string;
  created_at: string;
}

const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

/**
 * User ki teams nikalo.
 */
export async function getUserTeams(userId: string): Promise<Team[]> {
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("team_members")
    .select("teams(*)")
    .eq("user_id", userId);

  if (error) throw error;
  return (data ?? []).map((row) => row.teams as unknown as Team);
}

/**
 * Team ke members nikalo.
 */
export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("team_id", teamId);

  if (error) throw error;

  // Fetch user emails from profiles
  const userIds = (data ?? []).map((m) => m.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  return (data ?? []).map((m) => ({
    ...m,
    role: m.role as "owner" | "admin" | "member",
    full_name: profiles?.find((p) => p.id === m.user_id)?.full_name ?? undefined,
  }));
}

/**
 * Naya team create karo.
 */
export async function createTeam(
  name: string,
  ownerId: string
): Promise<Team> {
  const supabase = supabaseAdmin();

  // Team banao
  const { data: team, error: teamErr } = await supabase
    .from("teams")
    .insert({ name, owner_id: ownerId })
    .select()
    .single();

  if (teamErr) throw teamErr;

  // Owner ko member bhi banao
  await supabase.from("team_members").insert({
    team_id: team.id,
    user_id: ownerId,
    role: "owner",
  });

  return team;
}

/**
 * Team member invite karo (email ke through).
 */
export async function inviteMember(
  teamId: string,
  email: string,
  role: "admin" | "member",
  invitedBy: string
): Promise<TeamInvitation> {
  const supabase = supabaseAdmin();

  const { data: existingUser } = await supabase.auth.admin.listUsers();
  const matched = existingUser.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (matched) {
    const { data: existingMember } = await supabase
      .from("team_members")
      .select("id")
      .eq("team_id", teamId)
      .eq("user_id", matched.id)
      .single();

    if (existingMember) {
      throw new Error("User is already a member of this team");
    }
  }

  // Generate invitation token
  const token = generateInviteToken();

  // Create invitation
  const { data: invitation, error } = await supabase
    .from("team_invitations")
    .insert({
      team_id: teamId,
      email,
      role,
      invited_by: invitedBy,
      token,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    })
    .select()
    .single();

  if (error) throw error;

  return invitation as TeamInvitation;
}

/**
 * Invitation accept karo.
 */
export async function acceptInvitation(
  token: string,
  userId: string
): Promise<void> {
  const supabase = supabaseAdmin();

  // Invitation nikalo
  const { data: invitation, error: invErr } = await supabase
    .from("team_invitations")
    .select("*")
    .eq("token", token)
    .eq("accepted", false)
    .single();

  if (invErr || !invitation) {
    throw new Error("Invalid or expired invitation");
  }

  // Check expiry
  if (new Date(invitation.expires_at) < new Date()) {
    throw new Error("Invitation has expired");
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from("team_members")
    .select("id")
    .eq("team_id", invitation.team_id)
    .eq("user_id", userId)
    .single();

  if (existing) {
    throw new Error("You are already a member of this team");
  }

  // Add as member
  await supabase.from("team_members").insert({
    team_id: invitation.team_id,
    user_id: userId,
    role: invitation.role,
  });

  // Mark invitation as accepted
  await supabase
    .from("team_invitations")
    .update({ accepted: true })
    .eq("id", invitation.id);
}

/**
 * Team member remove karo.
 */
export async function removeMember(
  teamId: string,
  memberId: string,
  removedBy: string
): Promise<void> {
  const supabase = supabaseAdmin();

  // Check ki removedBy ko permission hai
  const { data: remover } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", removedBy)
    .single();

  if (!remover || (remover.role !== "owner" && remover.role !== "admin")) {
    throw new Error("Only owner or admin can remove members");
  }

  // Owner ko remove nahi kar sakte
  const { data: target } = await supabase
    .from("team_members")
    .select("role")
    .eq("id", memberId)
    .single();

  if (target?.role === "owner") {
    throw new Error("Cannot remove the team owner");
  }

  await supabase.from("team_members").delete().eq("id", memberId);
}

function generateInviteToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}
