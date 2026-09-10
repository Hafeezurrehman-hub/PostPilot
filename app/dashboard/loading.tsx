export default function Loading() {
  return (
    <main className="flex-1 bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 h-[65px]" />
      <div className="mx-auto max-w-5xl px-6 py-10 animate-pulse">
        <div className="h-6 w-40 rounded bg-slate-800" />
        <div className="h-4 w-56 rounded bg-slate-800 mt-3" />
        <div className="mt-8 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg border border-slate-800 bg-slate-900" />
          ))}
        </div>
      </div>
    </main>
  );
}
