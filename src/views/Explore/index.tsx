import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AnimatePresence, LayoutGroup } from 'motion/react';
import { ArrowUpDown, SlidersHorizontal, Telescope } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Field';
import { tierCounts as countTiers } from '@/domain/scoring';
import type { Tier } from '@/domain/types';
import { useData } from '@/store/data';
import { useScores, useToday } from '@/store/selectors';
import { ConferenceDrawer } from './ConferenceDrawer';
import { ConferenceRow } from './ConferenceRow';
import { FilterRail } from './FilterRail';
import { ScoringPanel } from './ScoringPanel';
import { DEFAULT_FILTERS, applyFilters, countActiveFilters, sortConferences, type Filters, type SortKey } from './filters';

export default function Explore() {
  const { id } = useParams();
  const navigate = useNavigate();
  const conferences = useData((s) => s.conferences);
  const reps = useData((s) => s.reps);
  const scores = useScores();
  const today = useToday();

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortKey>('score');
  const [mobilePanel, setMobilePanel] = useState<'filters' | 'scoring' | null>(null);

  const inWindow = useMemo(() => applyFilters(conferences, scores, { ...DEFAULT_FILTERS, when: filters.when }, today), [conferences, scores, filters.when, today]);
  const filtered = useMemo(() => applyFilters(conferences, scores, filters, today), [conferences, scores, filters, today]);
  const sorted = useMemo(() => sortConferences(filtered, scores, sort), [filtered, scores, sort]);
  const tierCounts = useMemo(() => countTiers(inWindow.map((c) => scores.get(c.id)!)), [inWindow, scores]);
  const nameOf = useMemo(() => new Map(conferences.map((c) => [c.id, c.name])), [conferences]);
  const repsById = useMemo(() => new Map(reps.map((r) => [r.id, r])), [reps]);

  const open = useCallback((cid: string) => navigate(`/conferences/${cid}`), [navigate]);
  const close = useCallback(() => navigate('/conferences'), [navigate]);
  const active = countActiveFilters(filters);

  return (
    <div className="grid gap-5 lg:grid-cols-[212px_minmax(0,1fr)_268px] xl:gap-6 xl:grid-cols-[232px_minmax(0,1fr)_284px]">
      {/* Left rail (desktop) */}
      <aside className="hidden lg:block">
        <div className="sticky top-20">
          <FilterRail filters={filters} onChange={setFilters} tierCounts={tierCounts} />
        </div>
      </aside>

      {/* List */}
      <section className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="display text-[28px] leading-none text-ink">
            {sorted.length} <span className="text-ink-muted">event{sorted.length === 1 ? '' : 's'}</span>
          </h2>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-dim" />
              <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-9 w-auto pl-8 pr-8 text-[12.5px]">
                <option value="score">Best fit first</option>
                <option value="date">Soonest first</option>
                <option value="audience">Biggest first</option>
                <option value="name">A to Z</option>
              </Select>
            </div>
            <Button size="sm" className="lg:hidden" icon={<SlidersHorizontal className="h-3.5 w-3.5" />} onClick={() => setMobilePanel('filters')}>
              Filters{active > 0 ? ` · ${active}` : ''}
            </Button>
            <Button size="sm" className="lg:hidden" onClick={() => setMobilePanel('scoring')}>
              Weights
            </Button>
          </div>
        </div>

        <div className="mb-3 lg:hidden">
          <FilterRail filters={filters} onChange={setFilters} tierCounts={tierCounts} showSearch className="[&>*:not(:first-child)]:hidden" />
        </div>

        {sorted.length === 0 ? (
          <EmptyState icon={<Telescope className="h-8 w-8" />} title="Nothing matches" body="Loosen a filter, or use Discover to find events you don't have yet." action={<Button size="sm" onClick={() => setFilters({ ...DEFAULT_FILTERS, when: filters.when })}>Clear filters</Button>} />
        ) : (
          <LayoutGroup id="explore-list">
            <div className="flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {sorted.map((c, i) => {
                  const r = scores.get(c.id)!;
                  return (
                    <ConferenceRow
                      key={c.id}
                      conference={c}
                      result={r}
                      reps={c.assignedRepIds.map((rid) => repsById.get(rid)).filter((x): x is NonNullable<typeof x> => !!x)}
                      onOpen={open}
                      hostName={r.piggybackOf ? nameOf.get(r.piggybackOf) : undefined}
                      index={i}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          </LayoutGroup>
        )}
      </section>

      {/* Right rail (desktop) */}
      <aside className="hidden lg:block">
        <div className="card sticky top-20 p-4">
          <ScoringPanel tierCounts={tierCounts} total={inWindow.length} />
        </div>
      </aside>

      {/* Mobile sheets */}
      <Drawer open={mobilePanel === 'filters'} onClose={() => setMobilePanel(null)} title={<p className="font-semibold text-ink">Filters</p>}>
        <FilterRail filters={filters} onChange={setFilters} tierCounts={tierCounts} showSearch={false} />
      </Drawer>
      <Drawer open={mobilePanel === 'scoring'} onClose={() => setMobilePanel(null)} title={<p className="font-semibold text-ink">Scoring weights</p>}>
        <ScoringPanel tierCounts={tierCounts} total={inWindow.length} />
      </Drawer>

      <ConferenceDrawer id={id} onClose={close} />
    </div>
  );
}

export type { Tier };
