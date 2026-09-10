import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex-1 bg-slate-950 text-slate-100 flex items-center justify-center px-6">
      <div className="text-center">
        <p className="text-sm font-medium text-indigo-400">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          The link may be broken or the page may have been removed.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-400 transition-colors"
        >
          Go Home
        </Link>
      </div>
    </main>
  );
}
