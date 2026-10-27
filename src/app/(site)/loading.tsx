export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-mist text-navy grid min-h-[70svh] place-items-center px-6 py-32"
    >
      <div className="w-full max-w-lg space-y-6">
        <p className="t-eyebrow">Loading your next page…</p>
        <div aria-hidden="true" className="space-y-4 motion-safe:animate-pulse">
          <div className="bg-navy/10 h-12 w-3/4 rounded" />
          <div className="bg-navy/10 h-4 rounded" />
          <div className="bg-navy/10 h-4 w-2/3 rounded" />
        </div>
      </div>
    </div>
  );
}
