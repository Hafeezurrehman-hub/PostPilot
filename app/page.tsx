import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-24">
        <p className="mb-4 text-sm font-medium tracking-widest text-indigo-400 uppercase">
          One Place • Every Platform
        </p>
        <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-white">
          Write one post.
          <br />
          <span className="text-indigo-400">Reach every platform.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-slate-400">
          Instagram, Facebook, Twitter/X, and LinkedIn — no need to post separately
          everywhere. Write once here, publish everywhere.
        </p>
        <div className="mt-10 flex gap-4">
          <Link
            href="/login"
            className="rounded-md bg-indigo-500 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-400 transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md border border-slate-700 px-6 py-3 text-sm font-medium text-slate-200 hover:border-slate-500 transition-colors"
          >
            View Dashboard
          </Link>
        </div>

        <div className="mt-24 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {["Instagram", "Facebook", "Twitter / X", "LinkedIn"].map((name) => (
            <div
              key={name}
              className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300"
            >
              {name}
            </div>
          ))}
        </div>

        <footer className="mt-20 pt-6 border-t border-slate-800 text-sm text-slate-600 flex gap-4">
          <Link href="/privacy" className="hover:text-slate-400">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-slate-400">
            Terms of Service
          </Link>
        </footer>
      </div>
    </main>
  );
}
