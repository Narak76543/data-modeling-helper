export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <div className="max-w-md w-full border border-ink/20 bg-surface p-8 rounded-sm">
        <h1 className="text-xl font-semibold text-ink mb-2">Data Modeling Helper</h1>
        <p className="text-sm text-ink-muted mb-6">
          Project scaffolded. Visual entity builder and validation engine ready for Phase 2 implementation.
        </p>
        <div className="text-xs font-mono bg-bg border border-ink/10 p-3 rounded-sm text-ink-muted">
          Backend API: <span className="text-ink">/api/v1</span>
        </div>
      </div>
    </main>
  );
}
