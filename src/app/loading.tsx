export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Ładowanie strony"
      className="page-container py-12"
    >
      <div className="mb-3 h-9 w-60 skeleton rounded-lg bg-elevated" />
      <div className="mb-10 h-4 w-3/4 max-w-lg skeleton rounded bg-elevated" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-80 skeleton rounded-xl bg-elevated" />
        ))}
      </div>
      <span className="sr-only">Ładowanie…</span>
    </div>
  );
}
