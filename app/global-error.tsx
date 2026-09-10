"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex items-center justify-center bg-slate-950 text-slate-100 px-6">
        <div className="text-center">
          <p className="text-sm font-medium text-rose-400">Something went wrong</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">
            An error occurred
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Please try again, or reload the page if the problem continues.
          </p>
          <button
            onClick={reset}
            className="mt-6 rounded-md bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-400 transition-colors"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
