"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function authRedirectTo(path: string) {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${origin}/auth/callback?next=${encodeURIComponent(path)}`;
}

function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }
  if (lower.includes("email not confirmed")) {
    return "Please confirm your email first, then log in.";
  }
  if (lower.includes("user already registered")) {
    return "This email is already registered. Log in instead.";
  }
  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return "Cannot reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL in .env.local.";
  }
  return message;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
  const urlError = searchParams.get("error");

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    urlError ? friendlyAuthError(urlError) : null
  );
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabaseConfigured = useMemo(
    () =>
      Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ),
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!supabaseConfigured) {
      setError(
        "Supabase is not configured. Copy .env.local.example to .env.local and add your project URL and anon key."
      );
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: authRedirectTo("/dashboard") },
        });

        if (signUpError) {
          setError(friendlyAuthError(signUpError.message));
          return;
        }

        if (data.session) {
          window.location.assign(nextPath.startsWith("/") ? nextPath : "/dashboard");
          return;
        }

        setInfo("Account created. Check your email to confirm, then log in.");
        setMode("login");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(friendlyAuthError(signInError.message));
        return;
      }

      window.location.assign(nextPath.startsWith("/") ? nextPath : "/dashboard");
    } catch (err) {
      setError(
        friendlyAuthError(err instanceof Error ? err.message : "Login failed")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 bg-slate-950 text-slate-100 flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-300">
          ← Back
        </Link>

        <h1 className="mt-6 text-2xl font-semibold text-white">
          {mode === "login" ? "Log In" : "Create Account"}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {mode === "login"
            ? "Log in to manage your posts."
            : "Get started for free, no card required."}
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm text-slate-300">Password</label>
              {mode === "login" && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!email) {
                      setError("Enter your email first, then request a reset link.");
                      return;
                    }
                    setError(null);
                    setInfo(null);
                    const supabase = createClient();
                    const { error: resetError } =
                      await supabase.auth.resetPasswordForEmail(email, {
                        redirectTo: authRedirectTo("/update-password"),
                      });
                    if (resetError) {
                      setError(friendlyAuthError(resetError.message));
                    } else {
                      setInfo("A reset link has been sent to your email.");
                    }
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}
          {info && <p className="text-sm text-emerald-400">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 transition-colors disabled:opacity-50"
          >
            {loading ? "One moment..." : mode === "login" ? "Log In" : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
              setInfo(null);
            }}
            className="text-indigo-400 hover:text-indigo-300"
          >
            {mode === "login" ? "Sign up" : "Log in"}
          </button>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex-1 bg-slate-950 text-slate-100 flex items-center justify-center">
          <p className="text-sm text-slate-500">Loading...</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
