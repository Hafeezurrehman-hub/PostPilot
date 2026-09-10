import Link from "next/link";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <main className="flex-1 bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-300">
          ← Back
        </Link>
        <h1 className="mt-6 text-3xl font-semibold text-white">Terms of Service</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: August 20, 2026</p>

        <div className="mt-10 space-y-8 text-sm text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-medium text-white mb-2">1. Accepting these terms</h2>
            <p>
              By using PostPilot, you agree to these terms. If you don't agree,
              please don't use the app.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-2">2. What the app does</h2>
            <p>
              PostPilot lets you create a post and publish/schedule it across your
              connected social media accounts (Instagram, Facebook, Twitter/X, LinkedIn).
              It is a personal productivity tool.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-2">3. Your responsibilities</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You are responsible for the content you post</li>
              <li>You are responsible for following the terms and community guidelines
                  of each connected platform (Instagram, Facebook, etc.)</li>
              <li>You are responsible for keeping your account/password secure</li>
              <li>Do not use the app for any unlawful or illegal purpose</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-2">4. Service provided &ldquo;as-is&rdquo;</h2>
            <p>
              PostPilot operates on a best-effort basis. We do not guarantee that
              every post will publish successfully at all times &mdash; third-party
              platform APIs (Meta, Twitter, LinkedIn) may have their own limits,
              downtime, or policy changes that are outside our control.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-2">5. Account termination</h2>
            <p>
              You can delete your account at any time. We may also suspend or
              terminate an account if it violates these terms or the policies of
              any connected platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-2">6. Changes</h2>
            <p>
              These terms may be updated over time. Continued use means you agree
              to the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-2">7. Contact</h2>
            <p>For questions: hafeez.digitalwork@gmail.com</p>
          </section>
        </div>
      </div>
    </main>
  );
}
