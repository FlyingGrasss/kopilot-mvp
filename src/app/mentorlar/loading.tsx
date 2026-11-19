export default function MentorlarLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <div aria-hidden="true" className="max-w-xl space-y-3">
        <div className="h-9 w-52 rounded-lg bg-[color:var(--elevated)]" />
        <div className="h-4 w-full rounded bg-[color:var(--elevated)]" />
        <div className="h-4 w-2/3 rounded bg-[color:var(--elevated)]" />
      </div>
      <div aria-hidden="true" className="mt-8 grid gap-6 lg:grid-cols-[16rem_1fr]">
        <div className="h-80 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)]" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              className="h-64 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)]"
              key={index}
            />
          ))}
        </div>
      </div>
      <p className="sr-only" role="status">
        Mentorlar yükleniyor.
      </p>
    </div>
  );
}
