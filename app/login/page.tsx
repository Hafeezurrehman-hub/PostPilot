"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { ArrowLeft, Zap, Eye, EyeOff } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="pp-auth">
      <div className="pp-auth__glow pp-auth__glow--1" />
      <div className="pp-auth__glow pp-auth__glow--2" />

      <div className="pp-auth__card">
        <Link href="/" className="pp-auth__back">
          <ArrowLeft size={14} />
          Back
        </Link>

        <div className="pp-auth__logo">
          <div className="pp-logo__icon">
            <Zap size={16} />
          </div>
          <span className="pp-auth__logo-text">
            Post<span>Pilot</span>
          </span>
        </div>

        <h1 className="pp-auth__title">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="pp-auth__subtitle">
          {mode === "login"
            ? "Log in to manage your posts."
            : "Get started for free, no card required."}
        </p>

        <form className="pp-auth__form" onSubmit={handleSubmit}>
          <div className="pp-form-group">
            <label className="pp-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="pp-input"
            />
          </div>

          <div className="pp-form-group">
            <div className="pp-auth__label-row">
              <label className="pp-label" htmlFor="password">Password</label>
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
                  className="pp-link pp-auth__forgot"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="pp-input-wrap">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pp-input"
              />
              <button
                type="button"
                className="pp-input-eye"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && <p className="pp-auth__msg pp-auth__msg--error">{error}</p>}
          {info && <p className="pp-auth__msg pp-auth__msg--info">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="pp-btn pp-btn--primary pp-btn--full"
          >
            {loading ? "One moment..." : mode === "login" ? "Log In" : "Create Account"}
          </button>
        </form>

        <p className="pp-auth__switch">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
              setInfo(null);
            }}
            className="pp-link"
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
        <main className="pp-auth">
          <div className="pp-auth__card">
            <p className="pp-auth__subtitle">Loading...</p>
          </div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
