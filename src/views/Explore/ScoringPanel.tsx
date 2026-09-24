import { RotateCcw } from 'lucide-react';
import { Slider } from '@/components/ui/Slider';
import { Chip } from '@/components/ui/Chip';
import { TIER_COLOR } from '@/components/ui/Badge';
import { DEFAULT_WEIGHTS, WEIGHT_LABELS, WEIGHT_PRESETS, normalizeWeights } from '@/domain/scoring';
import { TIER_LABELS, type ScoringWeights, type Tier } from '@/domain/types';
import { useSettings } from '@/store/settings';
import { cn } from '@/lib/cn';

const KEYS = Object.keys(WEIGHT_LABELS) as (keyof ScoringWeights)[];
const TIERS = Object.keys(TIER_LABELS) as Tier[];

export function ScoringPanel({ tierCounts, className, total }: { tierCounts: Record<Tier, number>; className?: string; total: number }) {
  const weights = useSettings((s) => s.weights);
  const presetId = useSettings((s) => s.presetId);
  const setWeights = useSettings((s) => s.setWeights);
  const norm = normalizeWeights(weights);
  const preset = WEIGHT_PRESETS.find((p) => p.id === presetId);

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-dim">Scoring weights</p>
          <button
            type="button"
            onClick={() => setWeights(DEFAULT_WEIGHTS, 'pipeline')}
            className="flex items-center gap-1 text-[11.5px] text-ink-muted hover:text-ink"
            title="Reset to default"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {WEIGHT_PRESETS.map((p) => (
            <Chip key={p.id} active={presetId === p.id} onClick={() => setWeights(p.weights, p.id)} title={p.blurb}>
              {p.label}
            </Chip>
          ))}
          {presetId === 'custom' && <Chip active>Custom</Chip>}
        </div>
        <p className="mt-2 text-[12px] leading-snug text-ink-muted">{preset?.blurb ?? 'Your own mix. Drag a slider and the ranking updates live.'}</p>
      </div>

      <div className="flex flex-col gap-3.5">
        {KEYS.map((k) => (
          <Slider
            key={k}
            label={WEIGHT_LABELS[k].label}
            hint={WEIGHT_LABELS[k].hint}
            value={weights[k]}
            min={0}
            max={0.6}
            step={0.01}
            onChange={(v) => setWeights({ ...weights, [k]: v })}
            format={() => `${Math.round(norm[k] * 100)}%`}
          />
        ))}
      </div>

      <div>
        <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-dim">
          Tiers <span className="text-ink-dim/70">· {total} events</span>
        </p>
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-3">
          {TIERS.map((t) => (
            <div
              key={t}
              className="h-full transition-[width] duration-500"
              style={{ width: `${total ? (tierCounts[t] / total) * 100 : 0}%`, background: TIER_COLOR[t] }}
              title={`${TIER_LABELS[t]}: ${tierCounts[t]}`}
            />
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
          {TIERS.map((t) => (
            <div key={t} className="flex items-center gap-1.5 text-[12px] text-ink-muted">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: TIER_COLOR[t] }} />
              <span>{TIER_LABELS[t]}</span>
              <span className="numeric ml-auto font-mono text-[11px] text-ink">{tierCounts[t]}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[11.5px] leading-snug text-ink-dim">
        Score = Σ weight × component, 0–100. Anchor ≥ 75, Cover ≥ 58, Opportunistic ≥ 40. An Opportunistic event next to an Anchor trip gets +8.
      </p>
    </div>
  );
}
