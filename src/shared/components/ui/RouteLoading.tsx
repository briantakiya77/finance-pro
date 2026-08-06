export function RouteLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto flex min-h-[58vh] max-w-6xl items-center justify-center"
    >
      <div className="flex items-center gap-3 rounded-panel border border-border bg-surface px-4 py-3 text-sm text-text-secondary shadow-panel">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-40" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-accent" />
        </span>
        <span>Carregando rota...</span>
      </div>
    </div>
  );
}
