"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/toast-context";
import { platformIcon, platformColor } from "@/components/PlatformIcons";
import type { PlatformMeta } from "@/lib/platform-data";

interface Connection {
  platform: string;
  platform_username: string | null;
  expires_at: string | null;
}

function getTokenStatus(conn: Connection | undefined): "valid" | "expiring" | "expired" | "none" {
  if (!conn) return "none";
  if (!conn.expires_at) return "valid";

  const now = Date.now();
  const expiresAt = new Date(conn.expires_at).getTime();
  const TEN_DAYS = 10 * 24 * 60 * 60 * 1000;
  const ONE_HOUR = 60 * 60 * 1000;

  if (now >= expiresAt) return "expired";
  if (expiresAt - now < TEN_DAYS) return "expiring";
  if (expiresAt - now < ONE_HOUR) return "expired";
  return "valid";
}

const STATUS_CONFIG = {
  valid: {
    badge: "Connected",
    badgeClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    dotClass: "bg-emerald-400",
  },
  expiring: {
    badge: "Expiring soon",
    badgeClass: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    dotClass: "bg-amber-400",
  },
  expired: {
    badge: "Expired",
    badgeClass: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    dotClass: "bg-rose-400",
  },
  none: {
    badge: "",
    badgeClass: "",
    dotClass: "",
  },
};

export default function ConnectCard({
  platform,
  connection,
}: {
  platform: PlatformMeta;
  connection?: Connection;
}) {
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [setupForm, setSetupForm] = useState<Record<string, string>>({});
  const [setupLoading, setSetupLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const status = getTokenStatus(connection);
  const config = STATUS_CONFIG[status];
  const isConnected = status !== "none";
  const Icon = platformIcon(platform.id);
  const brandColor = platformColor(platform.id);

  const handleDisconnect = async () => {
    if (!confirmDisconnect) {
      setConfirmDisconnect(true);
      setTimeout(() => setConfirmDisconnect(false), 4000);
      return;
    }

    setDisconnecting(true);
    try {
      const res = await fetch("/api/auth/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: platform.id }),
      });

      if (!res.ok) {
        toast("Failed to disconnect", "error");
      } else {
        toast(`${platform.name} disconnected`, "success");
        router.refresh();
      }
    } catch {
      toast("Network error", "error");
    } finally {
      setDisconnecting(false);
      setConfirmDisconnect(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await fetch(`/api/posts/test-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: platform.id }),
      });
      if (res.ok) {
        toast(`${platform.name} is working!`, "success");
      } else {
        const data = await res.json();
        toast(data.error || "Connection test failed", "error");
      }
    } catch {
      toast("Could not test connection", "error");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 transition-all duration-200">
      {/* Main row */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Platform icon */}
        <div
          className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${brandColor}15` }}
        >
          {Icon && <Icon className="w-5 h-5" style={{ color: brandColor }} />}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-white">{platform.name}</p>
            {isConnected && (
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${config.badgeClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
                {config.badge}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isConnected ? (
              <>Connected as <span className="text-slate-400">@{connection?.platform_username ?? "unknown"}</span></>
            ) : (
              platform.description
            )}
          </p>
          {isConnected && status === "expiring" && (
            <p className="text-xs text-amber-500/70 mt-0.5">Token expires soon — reconnect to keep posting</p>
          )}
          {isConnected && status === "expired" && (
            <p className="text-xs text-rose-500/70 mt-0.5">Token has expired — reconnect to fix</p>
          )}
          {platform.note && !isConnected && (
            <p className="text-xs text-amber-500/60 mt-0.5">{platform.note}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Help button */}
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-600 hover:text-slate-400 hover:bg-slate-800 transition-colors"
            title="How to connect"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {isConnected ? (
            <>
              {/* Test connection */}
              <button
                onClick={handleTest}
                disabled={testing}
                className="text-xs font-medium text-slate-400 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {testing ? "Testing..." : "Test"}
              </button>

              {/* Reconnect when expired/expiring */}
              {(status === "expired" || status === "expiring") && (
                <a
                  href={platform.authUrl}
                  className="text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Reconnect
                </a>
              )}

              {/* Disconnect */}
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                  confirmDisconnect
                    ? "text-white bg-rose-500 hover:bg-rose-400"
                    : "text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                }`}
              >
                {confirmDisconnect ? "Confirm?" : disconnecting ? "Removing..." : "Disconnect"}
              </button>
            </>
          ) : !platform.manualSetup ? (
            <a
              href={platform.authUrl}
              className="text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-400 px-4 py-2 rounded-lg transition-colors shadow-sm shadow-indigo-500/20"
            >
              Connect
            </a>
          ) : (
            <button
              onClick={() => setShowSetup(true)}
              className="text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-400 px-4 py-2 rounded-lg transition-colors shadow-sm shadow-indigo-500/20"
            >
              Setup
            </button>
          )}
        </div>
      </div>

      {/* Help panel (expandable) */}
      {showHelp && (
        <div className="px-5 pb-4 pt-0">
          <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 px-4 py-3">
            <p className="text-xs text-slate-300 leading-relaxed">{platform.help}</p>
          </div>
        </div>
      )}

      {/* Setup Modal for non-OAuth platforms */}
      {showSetup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${brandColor}15` }}
              >
                {Icon && <Icon className="w-5 h-5" style={{ color: brandColor }} />}
              </div>
              <div>
                <h3 className="text-white font-medium">Setup {platform.name}</h3>
                <p className="text-xs text-slate-500">Manual token configuration</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">{platform.help}</p>

            {platform.id === "bluesky" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Handle</label>
                  <input
                    type="text"
                    placeholder="your-handle.bsky.social"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    onChange={(e) => setSetupForm({ ...setupForm, handle: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">App Password</label>
                  <input
                    type="password"
                    placeholder="xxxx-xxxx-xxxx-xxxx"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    onChange={(e) => setSetupForm({ ...setupForm, appPassword: e.target.value })}
                  />
                </div>
              </div>
            )}

            {platform.id === "whatsapp" && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Phone Number ID</label>
                  <input
                    type="text"
                    placeholder="e.g. 1234567890"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    onChange={(e) => setSetupForm({ ...setupForm, phoneNumberId: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Permanent Access Token</label>
                  <input
                    type="password"
                    placeholder="EAAxxxx..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    onChange={(e) => setSetupForm({ ...setupForm, accessToken: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowSetup(false)}
                className="flex-1 text-sm text-slate-400 bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setSetupLoading(true);
                  try {
                    const res = await fetch(`/api/auth/${platform.id}/setup`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(setupForm),
                    });
                    if (res.ok) {
                      toast(`${platform.name} connected!`, "success");
                      setShowSetup(false);
                      router.refresh();
                    } else {
                      const data = await res.json();
                      toast(data.error || "Setup failed", "error");
                    }
                  } catch {
                    toast("Network error", "error");
                  } finally {
                    setSetupLoading(false);
                  }
                }}
                disabled={setupLoading}
                className="flex-1 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-400 px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {setupLoading ? "Connecting..." : "Connect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
