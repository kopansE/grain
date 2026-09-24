/** Temporary view body used while a section is being built. */
export function Placeholder({ title, phase, blurb }: { title: string; phase: number; blurb: string }) {
  return (
    <div className="card flex flex-col gap-3 p-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-dim">Phase {phase}</p>
      <h2 className="display text-4xl text-ink">{title}</h2>
      <p className="max-w-xl text-ink-muted">{blurb}</p>
    </div>
  );
}
