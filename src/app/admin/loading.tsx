export default function AdminLoading() {
  return (
    <div role="status" aria-live="polite" className="space-y-5 py-2">
      <p className="text-sm text-slate-500 dark:text-slate-400">Loading section…</p>
      <div aria-hidden="true" className="space-y-4 motion-safe:animate-pulse">
        <div className="h-7 w-48 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-48 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
      </div>
    </div>
  );
}
