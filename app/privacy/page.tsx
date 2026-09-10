import Link from "next/link";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <main className="flex-1 bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-300">
          ← Back
        </Link>
        <h1 className="mt-6 text-3xl font-semibold text-white">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated: August 20, 2026</p>

        <div className="mt-10 space-y-8 text-sm text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-medium text-white mb-2">1. What this app does</h2>
            <p>
              PostPilot is a tool that lets you create a post and publish it across
              your connected social media accounts (Instagram, Facebook, Twitter/X,
              LinkedIn) all at once.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-2">2. What data we collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your email address (to create an account)</li>
              <li>The content, text, and uploaded images of your posts</li>
              <li>
                When you connect a social media account, the access token from that
                platform and your username on that platform
              </li>
              <li>Basic usage data (when a post was created, which platforms were selected)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-2">3. What we use this data for</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To publish posts to your connected accounts on your behalf</li>
              <li>To show your drafts and post history</li>
              <li>To run and improve the app</li>
            </ul>
            <p className="mt-2">
              We do not sell your data, and we do not share it with any third-party
              advertisers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-2">4. Where data is stored</h2>
            <p>
              Your data is stored encrypted with Supabase (our database provider).
              Social media platform access tokens are stored securely and are only
              used to publish posts on your behalf.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-2">5. Third-party platforms</h2>
            <p>
              When you connect Instagram, Facebook, Twitter/X, or LinkedIn, that
              platform's own privacy policy also applies. We only request the
              permissions needed to publish posts.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-2">6. Your rights</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You can delete your account and data at any time</li>
              <li>You can disconnect any connected platform at any time</li>
              <li>You can request to export or delete your data at hafeez.digitalwork@gmail.com</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-2">7. Contact</h2>
            <p>
              For any questions, email us at hafeez.digitalwork@gmail.com.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
