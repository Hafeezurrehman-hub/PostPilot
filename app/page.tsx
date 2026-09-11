import Link from "next/link";
import { Zap, Sparkles, BarChart2, Users, Calendar, Check } from "lucide-react";

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI-Powered Captions",
    desc: "Describe your post once — AI writes optimized captions for every platform's tone and length.",
  },
  {
    icon: Calendar,
    title: "Schedule Everywhere",
    desc: "Plan your content calendar and let PostPilot publish automatically at the best time.",
  },
  {
    icon: BarChart2,
    title: "Unified Analytics",
    desc: "Track reach, engagement, and performance across every connected platform in one dashboard.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    desc: "Invite teammates, assign roles, and manage your brand's presence together.",
  },
];

const PLATFORMS = ["Twitter / X", "LinkedIn", "Instagram", "Facebook", "TikTok", "YouTube"];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "/forever",
    desc: "For individuals just getting started.",
    features: ["3 connected accounts", "10 posts / month", "Basic analytics", "AI captions (limited)"],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    desc: "For creators and small teams.",
    features: [
      "13 connected accounts",
      "Unlimited posts",
      "Full analytics suite",
      "Unlimited AI captions",
      "Scheduling & auto-publish",
      "Priority support",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Team",
    price: "$49",
    period: "/month",
    desc: "For growing marketing teams.",
    features: [
      "Everything in Pro",
      "Up to 5 team members",
      "Brand voice training",
      "Social listening",
      "Shared content calendar",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export default function Home() {
  return (
    <main className="flex-1 bg-slate-950 text-slate-100">
      {/* Nav */}
      <header className="border-b border-slate-800/60">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-white">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Zap size={15} strokeWidth={2.5} />
            </div>
            Post<span className="text-indigo-400">Pilot</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-300 hover:text-white transition-colors">
              Log in
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-24 text-center">
        <p className="mb-4 text-sm font-medium tracking-widest text-indigo-400 uppercase">
          One Place • Every Platform
        </p>
        <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-white">
          Write one post.
          <br />
          <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Reach every platform.
          </span>
        </h1>
        <p className="mt-6 max-w-xl mx-auto text-lg text-slate-400">
          Instagram, Facebook, Twitter/X, LinkedIn, TikTok, and YouTube — no need to post
          separately everywhere. Write once, publish everywhere, with AI doing the heavy lifting.
        </p>
        <div className="mt-10 flex flex-wrap gap-4 justify-center">
          <Link
            href="/login"
            className="rounded-md bg-indigo-500 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-400 transition-colors"
          >
            Get Started Free
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md border border-slate-700 px-6 py-3 text-sm font-medium text-slate-200 hover:border-slate-500 transition-colors"
          >
            View Dashboard
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-2 sm:grid-cols-6 gap-3">
          {PLATFORMS.map((name) => (
            <div
              key={name}
              className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300"
            >
              {name}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-slate-800/60 bg-slate-900/30">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="text-center mb-14">
            <p className="text-sm font-medium tracking-widest text-indigo-400 uppercase mb-3">
              Features
            </p>
            <h2 className="text-3xl sm:text-4xl font-semibold text-white">
              Everything you need to post smarter
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-slate-800 bg-slate-900 p-6 hover:border-slate-700 transition-colors"
              >
                <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4">
                  <Icon size={20} strokeWidth={1.8} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-slate-800/60">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="text-center mb-14">
            <p className="text-sm font-medium tracking-widest text-indigo-400 uppercase mb-3">
              Pricing
            </p>
            <h2 className="text-3xl sm:text-4xl font-semibold text-white">
              Simple pricing, no surprises
            </h2>
            <p className="mt-3 text-slate-400">Start free. Upgrade when you're ready to grow.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 items-start">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl p-6 border ${
                  plan.highlighted
                    ? "border-indigo-500 bg-gradient-to-b from-indigo-500/10 to-purple-500/5 relative"
                    : "border-slate-800 bg-slate-900"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-500 px-3 py-1 text-xs font-medium text-white">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold text-white">{plan.price}</span>
                  <span className="text-sm text-slate-500">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-slate-400">{plan.desc}</p>

                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                      <Check size={15} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/login"
                  className={`mt-8 block text-center rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
                    plan.highlighted
                      ? "bg-indigo-500 text-white hover:bg-indigo-400"
                      : "border border-slate-700 text-slate-200 hover:border-slate-500"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-800/60 bg-slate-900/30">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold text-white">
            Ready to post smarter?
          </h2>
          <p className="mt-4 text-slate-400">
            Join creators and teams who publish everywhere from one place.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-block rounded-md bg-indigo-500 px-8 py-3 text-sm font-medium text-white hover:bg-indigo-400 transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Zap size={11} strokeWidth={2.5} className="text-white" />
            </div>
            PostPilot
          </div>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-slate-400">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-slate-400">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
