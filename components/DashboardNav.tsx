"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/dashboard", label: "Posts" },
  { href: "/dashboard/new", label: "New Post" },
  { href: "/dashboard/connect", label: "Accounts" },
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/templates", label: "Templates" },
  { href: "/dashboard/brand-voice", label: "Voice" },
  { href: "/dashboard/listening", label: "Listen" },
  { href: "/dashboard/bulk", label: "Bulk" },
  { href: "/dashboard/links", label: "Links" },
  { href: "/dashboard/expenses", label: "Expenses" },
  { href: "/dashboard/teams", label: "Teams" },
];

export default function DashboardNav({ email }: { email?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const initials = email ? email.slice(0, 2).toUpperCase() : "??";

  return (
    <header className="border-b border-slate-800 bg-slate-950 sticky top-0 z-20">
      <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="text-white font-semibold">
          Post<span className="text-indigo-400">Pilot</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-6 text-sm text-slate-400 overflow-x-auto scrollbar-hide">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                pathname === link.href ? "text-white" : "hover:text-white transition-colors"
              }
            >
              {link.label}
            </Link>
          ))}
          <button onClick={handleLogout} className="hover:text-white transition-colors">
            Logout
          </button>
          <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-medium">
            {initials}
          </div>
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="sm:hidden h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-medium"
          aria-label="Open menu"
        >
          {initials}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <nav className="sm:hidden border-t border-slate-800 px-6 py-3 flex flex-col gap-3 text-sm text-slate-400">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={pathname === link.href ? "text-white" : "hover:text-white"}
            >
              {link.label}
            </Link>
          ))}
          <button onClick={handleLogout} className="text-left hover:text-white">
            Logout
          </button>
        </nav>
      )}
    </header>
  );
}
