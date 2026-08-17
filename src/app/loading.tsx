export default function Loading() {
  return (
    <div className="mx-auto flex min-h-72 max-w-6xl items-center px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 text-sm text-muted-foreground" role="status">
        <span className="size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
        Ładowanie…
      </div>
    </div>
  );
}
