export default function PanelLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <div aria-hidden="true" className="space-y-3">
        <div className="h-4 w-28 rounded bg-[color:var(--elevated)]" />
        <div className="h-9 w-72 max-w-full rounded-lg bg-[color:var(--elevated)]" />
        <div className="h-4 w-full max-w-xl rounded bg-[color:var(--elevated)]" />
      </div>
      <div aria-hidden="true" className="mt-6 grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            className="h-20 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)]"
            key={index}
          />
        ))}
      </div>
      <div
        aria-hidden="true"
        className="mt-6 h-72 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)]"
      />
      <p className="sr-only" role="status">
        Panel yükleniyor.
      </p>
    </div>
  );
}
