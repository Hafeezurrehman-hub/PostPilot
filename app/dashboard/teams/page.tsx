"use client";

import { useEffect, useState } from "react";
import DashboardNav from "@/components/DashboardNav";
import { useToast } from "@/lib/toast-context";

interface Team {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTeamName, setNewTeamName] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteTeamId, setInviteTeamId] = useState("");
  const [inviting, setInviting] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>();
  const [userId, setUserId] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserEmail(user?.email);
      setUserId(user?.id ?? "");
      loadTeams();
    };
    init();
  }, []);

  const loadTeams = async () => {
    try {
      const res = await fetch("/api/teams");
      const data = await res.json();
      setTeams(data.teams ?? []);
    } catch {
      toast("Failed to load teams", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name: newTeamName }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error ?? "Failed", "error");
      } else {
        toast("Team created!", "success");
        setNewTeamName("");
        loadTeams();
      }
    } catch {
      toast("Network error", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteTeamId) return;
    setInviting(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "invite",
          teamId: inviteTeamId,
          email: inviteEmail,
          role: "member",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Failed", "error");
      } else {
        toast(`Invitation sent to ${inviteEmail}!`, "success");
        setInviteEmail("");
        setInviteTeamId("");
      }
    } catch {
      toast("Network error", "error");
    } finally {
      setInviting(false);
    }
  };

  return (
    <main className="flex-1 bg-slate-950 text-slate-100">
      <DashboardNav email={userEmail} />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-xl font-semibold text-white">Teams</h1>
        <p className="text-sm text-slate-500 mt-1">
          Create teams to collaborate with others on posts.
        </p>

        {/* Create team */}
        <div className="mt-8 rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h3 className="text-sm font-medium text-white">Create a Team</h3>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Team name (e.g., Marketing)"
              className="flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleCreateTeam}
              disabled={creating || !newTeamName.trim()}
              className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50 transition-colors"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </div>

        {/* Team list */}
        <div className="mt-6 space-y-3">
          {loading ? (
            <p className="text-sm text-slate-500">Loading teams...</p>
          ) : teams.length === 0 ? (
            <div className="rounded-lg border border-slate-800 px-5 py-10 text-center">
              <p className="text-sm text-slate-400">No teams yet. Create one above!</p>
            </div>
          ) : (
            teams.map((team) => (
              <div
                key={team.id}
                className="rounded-lg border border-slate-800 bg-slate-900 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-white">{team.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Created {new Date(team.created_at).toLocaleDateString()}
                      {team.owner_id === userId && (
                        <span className="ml-2 text-indigo-400">(Owner)</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Invite form */}
                {team.owner_id === userId && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="email"
                      value={inviteTeamId === team.id ? inviteEmail : ""}
                      onChange={(e) => {
                        setInviteEmail(e.target.value);
                        setInviteTeamId(team.id);
                      }}
                      onFocus={() => setInviteTeamId(team.id)}
                      placeholder="Invite by email"
                      className="flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={handleInvite}
                      disabled={inviting || !inviteEmail.trim() || inviteTeamId !== team.id}
                      className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-500 disabled:opacity-50 transition-colors"
                    >
                      {inviting && inviteTeamId === team.id ? "Sending..." : "Invite"}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Info box */}
        <div className="mt-8 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <h3 className="text-sm font-medium text-slate-300">How Teams Work</h3>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-500">
            <li>• <strong className="text-slate-400">Owner</strong> — Full control: create, invite, remove members, delete team</li>
            <li>• <strong className="text-slate-400">Admin</strong> — Can invite members and manage posts</li>
            <li>• <strong className="text-slate-400">Member</strong> — Can view and create posts</li>
            <li>• Invitations expire after 7 days</li>
            <li>• All team members share the same connected platform accounts</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
