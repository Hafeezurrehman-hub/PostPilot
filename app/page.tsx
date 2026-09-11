"use client";

import Link from "next/link";
import { Zap, Check } from "lucide-react";
import { useEffect, useState } from "react";

// --- Dispatch board data ---
const DISPATCH_ITEMS = [
  { code: "IG", name: "Instagram", status: "Posted" },
  { code: "LI", name: "LinkedIn", status: "Posted" },
  { code: "TW", name: "Twitter / X", status: "Posting…" },
  { code: "TT", name: "TikTok", status: "Queued" },
  { code: "FB", name: "Facebook", status: "Posted" },
  { code: "YT", name: "YouTube", status: "Queued" },
  { code: "PN", name: "Pinterest", status: "Posted" },
  { code: "RD", name: "Reddit", status: "Posting…" },
];

// --- Features (no cards — plain icon + text rows) ---
const FEATURES = [
  {
    label: "Write once",
    detail:
      "Compose in PostPilot's editor. One draft goes everywhere — no copy-pasting, no reformatting per platform.",
  },
  {
    label: "AI rewrites per platform",
    detail:
      "LinkedIn needs a different tone than TikTok. The AI rewrites your caption automatically for each platform's voice and character limit.",
  },
  {
    label: "Schedule or post now",
    detail:
      "Pick a time and PostPilot publishes. Or hit 'Post now' and watch the dispatch board fill up in real time.",
  },
  {
    label: "One analytics view",
    detail:
      "Reach, impressions, and engagement across every connected account in a single dashboard — no platform-hopping.",
  },
];

// --- Pricing ---
const PLANS = [
  {
    name: "Free",
    price: "Rs 0",
    period: "forever",
    desc: "For individuals just getting started.",
    features: ["3 connected accounts", "10 posts / month", "Basic analytics", "AI captions (limited)"],
    cta: "Start free",
    primary: false,
  },
  {
    name: "Pro",
    price: "Rs 1,500",
    period: "per month",
    desc: "For creators and small teams.",
    features: [
      "13 connected accounts",
      "Unlimited posts",
      "Full analytics suite",
      "Unlimited AI captions",
      "Scheduling & auto-publish",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    primary: true,
  },
  {
    name: "Team",
    price: "Rs 4,000",
    period: "per month",
    desc: "For growing marketing teams.",
    features: [
      "Everything in Pro",
      "Up to 5 team members",
      "Brand voice training",
      "Social listening",
      "Shared content calendar",
    ],
    cta: "Upgrade to Team",
    primary: false,
  },
];

// --- Dispatch Board Component ---
function DispatchBoard() {
  const [activeIdx, setActiveIdx] = useState(2); // "Posting…" row highlighted

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % DISPATCH_ITEMS.length);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="dispatch-board">
      <div className="dispatch-header">
        <span className="dispatch-col-code">Platform</span>
        <span className="dispatch-col-status">Status</span>
      </div>
      {DISPATCH_ITEMS.map((item, i) => (
        <div
          key={item.code}
          className={`dispatch-row ${i === activeIdx ? "dispatch-row--active" : ""}`}
        >
          <span className="dispatch-code">{item.code}</span>
          <span className="dispatch-name">{item.name}</span>
          <span
            className={`dispatch-status ${
              item.status === "Posted"
                ? "dispatch-status--done"
                : item.status === "Posting…"
                ? "dispatch-status--live"
                : "dispatch-status--queued"
            }`}
          >
            {i === activeIdx ? "Posting…" : item.status}
          </span>
        </div>
      ))}
    </div>
  );
}

// --- Page ---
export default function Home() {
  return (
    <>
      <style>{`
        /* ── Tokens ── */
        :root {
          --bg:       #070B16;
          --surface:  #0D1526;
          --surface2: #131D35;
          --border:   #1A2540;
          --text:     #F1F5F9;
          --muted:    #4B5B73;
          --muted2:   #7E92B0;
          --indigo:   #6366F1;
          --indigo-h: #4F46E5;
          --purple:   #8B5CF6;
          --amber:    #F59E0B;
          --green:    #10B981;
        }

        /* ── Reset ── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg); color: var(--text); font-family: Inter, system-ui, sans-serif; }
        a { color: inherit; text-decoration: none; }

        /* ── Nav ── */
        .nav {
          border-bottom: 1px solid var(--border);
          position: sticky; top: 0; z-index: 50;
          background: rgba(7,11,22,0.85);
          backdrop-filter: blur(12px);
        }
        .nav-inner {
          max-width: 1100px; margin: 0 auto;
          padding: 0 24px;
          height: 58px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .logo {
          display: flex; align-items: center; gap: 8px;
          font-size: 15px; font-weight: 600; color: var(--text);
        }
        .logo-icon {
          width: 28px; height: 28px; border-radius: 8px;
          background: linear-gradient(135deg, var(--indigo), var(--purple));
          display: flex; align-items: center; justify-content: center;
        }
        .logo-accent { color: var(--indigo); }
        .nav-links { display: flex; align-items: center; gap: 8px; }
        .nav-ghost {
          font-size: 13px; color: var(--muted2); padding: 6px 12px;
          border-radius: 6px; transition: color .15s;
        }
        .nav-ghost:hover { color: var(--text); }
        .nav-cta {
          font-size: 13px; font-weight: 500;
          background: var(--indigo); color: #fff;
          padding: 7px 16px; border-radius: 6px;
          transition: background .15s;
        }
        .nav-cta:hover { background: var(--indigo-h); }

        /* ── Hero ── */
        .hero {
          max-width: 1100px; margin: 0 auto;
          padding: 80px 24px 72px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
          align-items: center;
        }
        .hero-eyebrow {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 500; color: var(--amber);
          background: rgba(245,158,11,.08);
          border: 1px solid rgba(245,158,11,.2);
          border-radius: 20px; padding: 4px 12px;
          margin-bottom: 24px;
          letter-spacing: .01em;
        }
        .hero-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--amber);
          animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .3; }
        }
        .hero-h1 {
          font-size: clamp(2rem, 4.5vw, 3.25rem);
          font-weight: 700;
          line-height: 1.08;
          letter-spacing: -0.03em;
          color: var(--text);
          margin-bottom: 20px;
        }
        .hero-sub {
          font-size: 16px; color: var(--muted2);
          line-height: 1.65;
          max-width: 440px;
          margin-bottom: 36px;
        }
        .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; }
        .btn-primary {
          display: inline-block;
          background: var(--indigo); color: #fff;
          font-size: 14px; font-weight: 500;
          padding: 11px 24px; border-radius: 8px;
          transition: background .15s;
        }
        .btn-primary:hover { background: var(--indigo-h); }
        .btn-ghost {
          display: inline-block;
          border: 1px solid var(--border); color: var(--muted2);
          font-size: 14px; font-weight: 500;
          padding: 11px 24px; border-radius: 8px;
          transition: border-color .15s, color .15s;
        }
        .btn-ghost:hover { border-color: var(--muted); color: var(--text); }

        /* ── Dispatch Board ── */
        .dispatch-board {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          overflow: hidden;
          font-size: 13px;
          font-variant-numeric: tabular-nums;
        }
        .dispatch-header {
          display: flex; gap: 0;
          padding: 10px 16px;
          border-bottom: 1px solid var(--border);
          font-size: 11px; font-weight: 500;
          color: var(--muted);
          letter-spacing: .05em;
          text-transform: uppercase;
        }
        .dispatch-col-code { width: 48px; }
        .dispatch-col-status { margin-left: auto; }
        .dispatch-row {
          display: flex; align-items: center;
          padding: 10px 16px;
          border-bottom: 1px solid var(--border);
          transition: background .2s;
        }
        .dispatch-row:last-child { border-bottom: none; }
        .dispatch-row--active { background: rgba(99,102,241,.06); }
        .dispatch-code {
          width: 36px;
          font-size: 11px; font-weight: 700;
          color: var(--muted);
          letter-spacing: .08em;
        }
        .dispatch-name {
          flex: 1;
          color: var(--text);
        }
        .dispatch-status {
          font-size: 12px; font-weight: 500;
          padding: 2px 8px; border-radius: 4px;
        }
        .dispatch-status--done {
          color: var(--green);
          background: rgba(16,185,129,.08);
        }
        .dispatch-status--live {
          color: var(--amber);
          background: rgba(245,158,11,.10);
          animation: blink .9s ease-in-out infinite;
        }
        .dispatch-status--queued {
          color: var(--muted2);
          background: var(--surface2);
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }

        /* ── Divider ── */
        .section-divider {
          border: none;
          border-top: 1px solid var(--border);
        }

        /* ── Features ── */
        .features-section {
          max-width: 1100px; margin: 0 auto;
          padding: 80px 24px;
        }
        .features-label {
          font-size: 12px; font-weight: 500; color: var(--muted);
          margin-bottom: 40px;
        }
        .features-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
        }
        .feature-row {
          padding: 28px 0;
          border-top: 1px solid var(--border);
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 24px;
        }
        .feature-label {
          font-size: 15px; font-weight: 600; color: var(--text);
          padding-right: 16px;
        }
        .feature-detail {
          font-size: 14px; color: var(--muted2); line-height: 1.65;
        }

        /* ── Pricing ── */
        .pricing-section {
          border-top: 1px solid var(--border);
        }
        .pricing-inner {
          max-width: 1100px; margin: 0 auto;
          padding: 80px 24px;
        }
        .pricing-head {
          margin-bottom: 52px;
        }
        .pricing-title {
          font-size: clamp(1.6rem, 3vw, 2.25rem);
          font-weight: 700; letter-spacing: -0.025em;
          color: var(--text);
          margin-bottom: 8px;
        }
        .pricing-sub {
          font-size: 15px; color: var(--muted2);
        }
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: var(--border);
          border: 1px solid var(--border);
          border-radius: 14px;
          overflow: hidden;
        }
        .plan {
          background: var(--surface);
          padding: 32px 28px;
          display: flex; flex-direction: column;
          position: relative;
        }
        .plan--primary {
          background: linear-gradient(160deg, rgba(99,102,241,.1), rgba(139,92,246,.05));
        }
        .plan-badge {
          position: absolute; top: -1px; left: 28px;
          font-size: 11px; font-weight: 600;
          color: var(--indigo);
          background: var(--surface2);
          border: 1px solid var(--border);
          border-top: none;
          border-radius: 0 0 6px 6px;
          padding: 3px 10px;
          letter-spacing: .04em;
        }
        .plan-name {
          font-size: 14px; font-weight: 600; color: var(--muted2);
          margin-bottom: 16px;
        }
        .plan-price {
          font-size: 2rem; font-weight: 700;
          color: var(--text); letter-spacing: -0.03em;
          line-height: 1;
        }
        .plan-period {
          font-size: 13px; color: var(--muted);
          margin-top: 4px; margin-bottom: 8px;
        }
        .plan-desc {
          font-size: 13px; color: var(--muted2);
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 20px;
        }
        .plan-features {
          flex: 1;
          list-style: none;
          display: flex; flex-direction: column; gap: 10px;
          margin-bottom: 28px;
        }
        .plan-feature {
          display: flex; align-items: flex-start; gap: 8px;
          font-size: 13px; color: var(--muted2); line-height: 1.5;
        }
        .plan-check {
          color: var(--green); flex-shrink: 0; margin-top: 2px;
        }
        .plan-cta {
          display: block; text-align: center;
          font-size: 14px; font-weight: 500;
          padding: 10px; border-radius: 8px;
          transition: background .15s, border-color .15s, color .15s;
        }
        .plan-cta--primary {
          background: var(--indigo); color: #fff;
        }
        .plan-cta--primary:hover { background: var(--indigo-h); }
        .plan-cta--ghost {
          border: 1px solid var(--border); color: var(--muted2);
        }
        .plan-cta--ghost:hover { border-color: var(--muted); color: var(--text); }

        /* ── CTA band ── */
        .cta-section {
          border-top: 1px solid var(--border);
          background: var(--surface);
        }
        .cta-inner {
          max-width: 700px; margin: 0 auto;
          padding: 80px 24px;
          text-align: center;
        }
        .cta-h2 {
          font-size: clamp(1.6rem, 3vw, 2.2rem);
          font-weight: 700; letter-spacing: -0.025em;
          color: var(--text);
          margin-bottom: 12px;
        }
        .cta-sub {
          font-size: 15px; color: var(--muted2);
          margin-bottom: 32px;
        }

        /* ── Footer ── */
        .footer {
          border-top: 1px solid var(--border);
        }
        .footer-inner {
          max-width: 1100px; margin: 0 auto;
          padding: 24px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px;
        }
        .footer-logo {
          display: flex; align-items: center; gap: 6px;
          font-size: 13px; color: var(--muted);
        }
        .footer-logo-icon {
          width: 18px; height: 18px; border-radius: 5px;
          background: linear-gradient(135deg, var(--indigo), var(--purple));
          display: flex; align-items: center; justify-content: center;
        }
        .footer-links {
          display: flex; gap: 24px;
        }
        .footer-link {
          font-size: 13px; color: var(--muted);
          transition: color .15s;
        }
        .footer-link:hover { color: var(--muted2); }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .hero {
            grid-template-columns: 1fr;
            gap: 40px;
            padding: 56px 20px 48px;
          }
          .hero-sub { max-width: 100%; }
          .features-grid { grid-template-columns: 1fr; }
          .feature-row {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          .pricing-grid {
            grid-template-columns: 1fr;
            gap: 1px;
          }
          .footer-inner { flex-direction: column; align-items: flex-start; }
        }
        @media (max-width: 480px) {
          .hero-h1 { font-size: 1.85rem; }
          .pricing-inner, .features-section, .cta-inner { padding-left: 16px; padding-right: 16px; }
        }
      `}</style>

      <main style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh" }}>

        {/* Nav */}
        <nav className="nav">
          <div className="nav-inner">
            <div className="logo">
              <div className="logo-icon">
                <Zap size={14} strokeWidth={2.5} color="#fff" />
              </div>
              Post<span className="logo-accent">Pilot</span>
            </div>
            <div className="nav-links">
              <Link href="/login" className="nav-ghost">Log in</Link>
              <Link href="/login" className="nav-cta">Get started</Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="hero">
          <div>
            <div className="hero-eyebrow">
              <span className="hero-dot" />
              13 platforms, one post
            </div>
            <h1 className="hero-h1">
              Your post,<br />
              dispatched<br />
              everywhere.
            </h1>
            <p className="hero-sub">
              Write once in PostPilot. The AI rewrites it for each platform's voice, then publishes — or schedules — across all 13 at once.
            </p>
            <div className="hero-actions">
              <Link href="/login" className="btn-primary">Start for free</Link>
              <Link href="/dashboard" className="btn-ghost">See the dashboard</Link>
            </div>
          </div>

          <div>
            <DispatchBoard />
          </div>
        </section>

        <hr className="section-divider" />

        {/* Features */}
        <section className="features-section">
          <p className="features-label">How it works</p>
          <div className="features-grid">
            {FEATURES.map((f) => (
              <div className="feature-row" key={f.label}>
                <div className="feature-label">{f.label}</div>
                <div className="feature-detail">{f.detail}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="pricing-section">
          <div className="pricing-inner">
            <div className="pricing-head">
              <h2 className="pricing-title">Straightforward pricing</h2>
              <p className="pricing-sub">Pay via JazzCash, Easypaisa, or bank transfer. Upgrade anytime.</p>
            </div>

            <div className="pricing-grid">
              {PLANS.map((plan) => (
                <div key={plan.name} className={`plan ${plan.primary ? "plan--primary" : ""}`}>
                  {plan.primary && <span className="plan-badge">Most popular</span>}
                  <div className="plan-name">{plan.name}</div>
                  <div className="plan-price">{plan.price}</div>
                  <div className="plan-period">{plan.period}</div>
                  <div className="plan-desc">{plan.desc}</div>
                  <ul className="plan-features">
                    {plan.features.map((f) => (
                      <li key={f} className="plan-feature">
                        <Check size={14} className="plan-check" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/login"
                    className={`plan-cta ${plan.primary ? "plan-cta--primary" : "plan-cta--ghost"}`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="cta-section">
          <div className="cta-inner">
            <h2 className="cta-h2">Your next post goes to 13 platforms. Ready?</h2>
            <p className="cta-sub">
              Join creators and teams who stopped posting one platform at a time.
            </p>
            <Link href="/login" className="btn-primary">
              Start for free
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer">
          <div className="footer-inner">
            <div className="footer-logo">
              <div className="footer-logo-icon">
                <Zap size={10} strokeWidth={2.5} color="#fff" />
              </div>
              PostPilot
            </div>
            <div className="footer-links">
              <Link href="/privacy" className="footer-link">Privacy</Link>
              <Link href="/terms" className="footer-link">Terms</Link>
            </div>
          </div>
        </footer>

      </main>
    </>
  );
}
