import { Search, X } from 'lucide-react';
import { Chip } from '@/components/ui/Chip';
import { Segmented } from '@/components/ui/Segmented';
import { TIER_COLOR } from '@/components/ui/Badge';
import { REGION_LABELS, TIER_LABELS, VERTICAL_LABELS, type ConferenceStatus, type Region, type Tier, type Vertical } from '@/domain/types';
import { STATUS_LABEL } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { DEFAULT_FILTERS, SIZE_BANDS, countActiveFilters, toggleIn, type Filters } from './filters';

const VERTICALS = Object.keys(VERTICAL_LABELS) as Vertical[];
const REGIONS = Object.keys(REGION_LABELS) as Region[];
const TIERS = Object.keys(TIER_LABELS) as Tier[];
const STATUSES: ConferenceStatus[] = ['considering', 'planned', 'attended', 'skipped'];

function Group({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-dim">{title}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

export function FilterRail({ filters, onChange, tierCounts, className, showSearch = true }: { filters: Filters; onChange: (f: Filters) => void; tierCounts: Record<Tier, number>; className?: string; showSearch?: boolean }) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const active = countActiveFilters(filters);
  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {showSearch && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" />
          <input
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
            placeholder="Search events, cities…"
            className="h-10 w-full rounded-xl border border-line bg-bg-elevated pl-9 pr-8 text-[13.5px] text-ink placeholder:text-ink-dim focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          {filters.q && (
            <button type="button" onClick={() => set({ q: '' })} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-dim hover:text-ink" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <Segmented
        size="sm"
        value={filters.when}
        onChange={(when) => set({ when })}
        options={[
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'past', label: 'Past' },
          { value: 'all', label: 'All' },
        ]}
      />

      <Group title="Tier">
        {TIERS.map((t) => (
          <Chip key={t} active={filters.tiers.includes(t)} onClick={() => set({ tiers: toggleIn(filters.tiers, t) })} color={TIER_COLOR[t]} count={tierCounts[t]}>
            {TIER_LABELS[t]}
          </Chip>
        ))}
      </Group>

      <Group title="Vertical">
        {VERTICALS.map((v) => (
          <Chip key={v} active={filters.verticals.includes(v)} onClick={() => set({ verticals: toggleIn(filters.verticals, v) })}>
            {VERTICAL_LABELS[v]}
          </Chip>
        ))}
      </Group>

      <Group title="Region">
        {REGIONS.map((r) => (
          <Chip key={r} active={filters.regions.includes(r)} onClick={() => set({ regions: toggleIn(filters.regions, r) })}>
            {REGION_LABELS[r]}
          </Chip>
        ))}
      </Group>

      <Group title="Audience">
        {SIZE_BANDS.map((b) => (
          <Chip key={b.value} active={filters.size === b.value} onClick={() => set({ size: b.value })}>
            {b.label}
          </Chip>
        ))}
      </Group>

      <Group title="Status">
        {STATUSES.map((s) => (
          <Chip key={s} active={filters.statuses.includes(s)} onClick={() => set({ statuses: toggleIn(filters.statuses, s) })}>
            {STATUS_LABEL[s]}
          </Chip>
        ))}
        <Chip active={filters.unassignedOnly} onClick={() => set({ unassignedOnly: !filters.unassignedOnly })}>
          Nobody assigned
        </Chip>
      </Group>

      {active > 0 && (
        <button type="button" onClick={() => onChange({ ...DEFAULT_FILTERS, when: filters.when })} className="self-start text-[12.5px] font-medium text-accent hover:underline">
          Clear {active} filter{active === 1 ? '' : 's'}
        </button>
      )}
    </div>
  );
}
