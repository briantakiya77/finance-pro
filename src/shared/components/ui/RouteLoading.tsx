export function RouteLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto flex min-h-[58vh] max-w-6xl items-center justify-center"
    >
      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface/80 px-4 py-3 text-sm text-text-secondary shadow-glow">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent" />
        <span>Carregando rota...</span>
      </div>
    </div>
  );
}
