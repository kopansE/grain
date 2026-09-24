import type { CoverageCell, Gap } from '@/domain/clustering';
import { REGION_LABELS, type Region } from '@/domain/types';
import { cn } from '@/lib/cn';

const REGIONS: Region[] = ['EMEA', 'NA', 'APAC', 'MEA', 'LATAM', 'IL'];

/** Quarters × regions. Solid = planned events, faint = candidates, outlined = a gap worth a decision. */
export function CoverageHeatmap({ grid, gaps, onPick }: { grid: CoverageCell[]; gaps: Gap[]; onPick: (cell: CoverageCell) => void }) {
  const quarters = [...new Map(grid.map((c) => [c.quarter.id, c.quarter])).values()];
  const gapKeys = new Set(gaps.map((g) => `${g.quarter.id}|${g.region}`));
  const maxPlanned = Math.max(1, ...grid.map((c) => c.planned.length));

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1.5">
        <thead>
          <tr>
            <th className="w-[110px]" />
            {quarters.map((q) => (
              <th key={q.id} className="pb-1 text-center text-[11px] font-medium text-ink-muted">
                {q.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {REGIONS.map((region) => (
            <tr key={region}>
              <td className="pr-2 text-[12px] font-medium text-ink-muted">{REGION_LABELS[region]}</td>
              {quarters.map((q) => {
                const cell = grid.find((c) => c.quarter.id === q.id && c.region === region)!;
                const isGap = gapKeys.has(`${q.id}|${region}`);
                const planned = cell.planned.length;
                const cand = cell.candidates.length;
                const intensity = planned / maxPlanned;
                return (
                  <td key={q.id} className="p-0">
                    <button
                      type="button"
                      onClick={() => onPick(cell)}
                      title={[...cell.planned.map((c) => `✓ ${c.name}`), ...cell.candidates.map((c) => `· ${c.name}`)].join('\n') || 'Nothing known here'}
                      className={cn(
                        'flex h-14 w-full flex-col items-center justify-center rounded-lg border text-[11px] transition-transform hover:scale-[1.03]',
                        isGap ? 'border-dashed border-rose/50' : 'border-line',
                      )}
                      style={{ background: planned > 0 ? `rgba(94,203,184,${0.16 + intensity * 0.5})` : cand > 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}
                    >
                      {planned > 0 ? (
                        <>
                          <span className="text-[16px] font-semibold leading-none text-ink">{planned}</span>
                          <span className="mt-0.5 text-[10px] text-ink-muted">planned</span>
                        </>
                      ) : cand > 0 ? (
                        <>
                          <span className="text-[13px] font-semibold leading-none text-ink-muted">{cand}</span>
                          <span className="mt-0.5 text-[10px] text-rose">to decide</span>
                        </>
                      ) : (
                        <span className={cn('text-[10px]', isGap ? 'text-rose/80' : 'text-ink-dim')}>{isGap ? 'no events' : '–'}</span>
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-teal/60" /> planned
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-rose/60" /> nothing planned yet
        </span>
      </div>
    </div>
  );
}
