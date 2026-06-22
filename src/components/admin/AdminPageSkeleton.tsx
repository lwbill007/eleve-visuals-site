export function AdminPageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 rounded bg-stone/30" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-12 rounded bg-stone/20" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-32 rounded bg-stone/20" />
        <div className="h-32 rounded bg-stone/20" />
      </div>
    </div>
  );
}

export function AdminListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="animate-pulse space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-20 border border-stone/20 bg-charcoal/20" />
      ))}
    </div>
  );
}
