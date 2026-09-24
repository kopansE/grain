import type { Conference, ConferenceStatus, Region, ScoreResult, Tier, Vertical } from '@/domain/types';

export type When = 'upcoming' | 'past' | 'all';
export type SizeBand = 'any' | 'small' | 'mid' | 'large';
export type SortKey = 'score' | 'date' | 'audience' | 'name';

export interface Filters {
  q: string;
  verticals: Vertical[];
  regions: Region[];
  tiers: Tier[];
  statuses: ConferenceStatus[];
  when: When;
  size: SizeBand;
  unassignedOnly: boolean;
}

export const DEFAULT_FILTERS: Filters = {
  q: '',
  verticals: [],
  regions: [],
  tiers: [],
  statuses: [],
  when: 'upcoming',
  size: 'any',
  unassignedOnly: false,
};

export const SIZE_BANDS: { value: SizeBand; label: string; test: (n: number) => boolean }[] = [
  { value: 'any', label: 'Any size', test: () => true },
  { value: 'small', label: 'Under 2k', test: (n) => n < 2000 },
  { value: 'mid', label: '2k – 10k', test: (n) => n >= 2000 && n <= 10000 },
  { value: 'large', label: '10k+', test: (n) => n > 10000 },
];

export function toggleIn<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export function countActiveFilters(f: Filters): number {
  return (
    (f.q ? 1 : 0) + f.verticals.length + f.regions.length + f.tiers.length + f.statuses.length + (f.size !== 'any' ? 1 : 0) + (f.unassignedOnly ? 1 : 0)
  );
}

export function applyFilters(conferences: Conference[], scores: Map<string, ScoreResult>, f: Filters, today: string): Conference[] {
  const q = f.q.trim().toLowerCase();
  const sizeTest = SIZE_BANDS.find((b) => b.value === f.size)?.test ?? (() => true);
  return conferences.filter((c) => {
    if (f.when === 'upcoming' && c.endDate < today) return false;
    if (f.when === 'past' && c.endDate >= today) return false;
    if (q && !`${c.name} ${c.series} ${c.city} ${c.country} ${c.description}`.toLowerCase().includes(q)) return false;
    if (f.verticals.length && !c.verticals.some((v) => f.verticals.includes(v))) return false;
    if (f.regions.length && !f.regions.includes(c.region)) return false;
    if (f.tiers.length && !f.tiers.includes(scores.get(c.id)?.tier ?? 'skip')) return false;
    if (f.statuses.length && !f.statuses.includes(c.status)) return false;
    if (!sizeTest(c.audienceSize)) return false;
    if (f.unassignedOnly && c.assignedRepIds.length > 0) return false;
    return true;
  });
}

export function sortConferences(list: Conference[], scores: Map<string, ScoreResult>, sort: SortKey): Conference[] {
  const s = (c: Conference) => scores.get(c.id)?.score ?? 0;
  return [...list].sort((a, b) => {
    switch (sort) {
      case 'score':
        return s(b) - s(a) || a.startDate.localeCompare(b.startDate);
      case 'date':
        return a.startDate.localeCompare(b.startDate) || s(b) - s(a);
      case 'audience':
        return b.audienceSize - a.audienceSize;
      case 'name':
        return a.name.localeCompare(b.name);
    }
  });
}
