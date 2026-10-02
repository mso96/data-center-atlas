export function AppShell({ demoCount }: { demoCount: number }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <h1 className="text-base font-semibold">Data Center Atlas</h1>
        <span className="rounded border border-border bg-elevated px-2 py-1 text-xs text-accent">Demo data</span>
      </header>
      <div className="grid flex-1 grid-cols-1 md:grid-cols-[20rem_minmax(0,1fr)]">
        <aside aria-labelledby="sidebar-title" className="border-b border-border bg-sidebar p-5 md:border-r md:border-b-0">
          <h2 id="sidebar-title" className="text-sm font-medium">Facility explorer</h2>
          <p className="mt-3 text-sm text-secondary-text">Search, filters, and facility information will appear here.</p>
          <p className="mt-6 text-xs text-secondary-text">{demoCount} fictional demo facilities available.</p>
        </aside>
        <main aria-labelledby="map-title" className="flex min-h-80 items-center justify-center p-6">
          <div className="text-center">
            <h2 id="map-title" className="text-sm font-medium">World map</h2>
            <p className="mt-2 text-sm text-secondary-text">Map placeholder · Phase 2</p>
          </div>
        </main>
      </div>
    </div>
  );
}
