import type { Conference, Region, Rep, ScoreResult, Tier } from './types';
import { REGION_LABELS } from './types';
import { estimateTravel, eventDays, haversineKm, type GeoPointLike } from '@/lib/geo';
import { gapDays } from './scoring';

/**
 * Planning intelligence: geographic/temporal clusters that could be one trip,
 * coverage gaps by quarter and region, Anchor collisions, and rep overload.
 * Everything derives from data; no hardcoded insight strings.
 */

export interface Cluster {
  id: string;
  label: string;
  conferenceIds: string[];
  startDate: string;
  endDate: string;
  spanDays: number;
  centroid: { lat: number; lng: number };
  /**
   * One combined trip versus flying to each event separately. Flights and
   * travel days are saved; extra hotel nights over the gap cost money, so
   * `usd` can be negative ("saves 2 travel days, costs about $300 more").
   */
  savings: { travelDays: number; usd: number; flightsSaved: number; extraNights: number };
  /** True when every event in the cluster is already planned. */
  fullyPlanned: boolean;
}

export interface ClusterOptions {
  maxGapDays?: number;
  maxDistanceKm?: number;
  homeBase: GeoPointLike & { label: string };
}

const TIER_RANK: Record<Tier, number> = { anchor: 3, cover: 2, opportunistic: 1, skip: 0 };

export function findClusters(
  conferences: Conference[],
  scores: Map<string, ScoreResult>,
  opts: ClusterOptions,
): Cluster[] {
  const maxGap = opts.maxGapDays ?? 10;
  const maxKm = opts.maxDistanceKm ?? 800;
  const pool = conferences
    .filter((c) => c.status !== 'skipped' && (scores.get(c.id)?.tier ?? 'skip') !== 'skip')
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  // Union-find over pairs that are close in both time and space.
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    const p = parent.get(x) ?? x;
    if (p === x) return x;
    const root = find(p);
    parent.set(x, root);
    return root;
  };
  const union = (a: string, b: string) => parent.set(find(a), find(b));
  for (const c of pool) parent.set(c.id, c.id);
  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      const a = pool[i]!;
      const b = pool[j]!;
      if (gapDays(a, b) > maxGap) continue;
      if (haversineKm(a, b) > maxKm) continue;
      union(a.id, b.id);
    }
  }

  const groups = new Map<string, Conference[]>();
  for (const c of pool) {
    const root = find(c.id);
    groups.set(root, [...(groups.get(root) ?? []), c]);
  }

  const clusters: Cluster[] = [];
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    members.sort((a, b) => a.startDate.localeCompare(b.startDate));
    const startDate = members[0]!.startDate;
    const endDate = members.reduce((m, c) => (c.endDate > m ? c.endDate : m), members[0]!.endDate);
    const spanDays = eventDays(startDate, endDate);
    const centroid = {
      lat: members.reduce((a, c) => a + c.lat, 0) / members.length,
      lng: members.reduce((a, c) => a + c.lng, 0) / members.length,
    };

    // Separate trips: each event flown to on its own. Combined: one flight, hotel across the span.
    const separate = members.map((c) => estimateTravel(c, eventDays(c.startDate, c.endDate), opts.homeBase));
    const combined = estimateTravel(centroid, spanDays, opts.homeBase);
    const flightsSaved = members.length - 1;
    const extraNights = Math.max(0, combined.nights - separate.reduce((a, t) => a + t.nights, 0));
    const usd = separate.reduce((a, t) => a + t.totalUsd, 0) - combined.totalUsd;
    const travelDays = Math.max(0, separate.reduce((a, t) => a + t.travelDays, 0) - combined.travelDays);

    const cities = [...new Set(members.map((c) => c.city))];
    const label = cities.length === 1 ? `${cities[0]} run` : `${cities.slice(0, 2).join(' + ')}${cities.length > 2 ? ' + more' : ''} swing`;
    const strongest = members.reduce((m, c) => (TIER_RANK[scores.get(c.id)!.tier] > TIER_RANK[scores.get(m.id)!.tier] ? c : m), members[0]!);

    clusters.push({
      id: 'cluster-' + members.map((c) => c.id).join('+'),
      label,
      conferenceIds: [strongest.id, ...members.filter((c) => c.id !== strongest.id).map((c) => c.id)],
      startDate,
      endDate,
      spanDays,
      centroid,
      savings: { travelDays, usd, flightsSaved, extraNights },
      fullyPlanned: members.every((c) => c.status === 'planned'),
    });
  }
  return clusters.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export interface Quarter {
  id: string; // '2027-Q1'
  label: string; // 'Q1 2027'
  startDate: string;
  endDate: string;
}

/** The four quarters starting from the quarter containing `from`. */
export function quartersFrom(from: string, count = 4): Quarter[] {
  const d = new Date(from + 'T00:00:00Z');
  let year = d.getUTCFullYear();
  let q = Math.floor(d.getUTCMonth() / 3);
  const out: Quarter[] = [];
  for (let i = 0; i < count; i++) {
    const startMonth = q * 3;
    const start = new Date(Date.UTC(year, startMonth, 1));
    const end = new Date(Date.UTC(year, startMonth + 3, 0));
    out.push({
      id: `${year}-Q${q + 1}`,
      label: `Q${q + 1} ${year}`,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    });
    q++;
    if (q === 4) {
      q = 0;
      year++;
    }
  }
  return out;
}

export interface CoverageCell {
  quarter: Quarter;
  region: Region;
  planned: Conference[];
  candidates: Conference[]; // non-skipped, tier >= opportunistic, not planned
}

export interface Gap extends CoverageCell {
  /** 'no-plans' = candidates exist but nothing planned; 'no-events' = nothing known at all. */
  kind: 'no-plans' | 'no-events';
}

export const COVERAGE_REGIONS: Region[] = ['EMEA', 'NA', 'APAC', 'MEA', 'LATAM', 'IL'];

export function coverageGrid(conferences: Conference[], scores: Map<string, ScoreResult>, from: string): CoverageCell[] {
  const quarters = quartersFrom(from);
  const cells: CoverageCell[] = [];
  for (const quarter of quarters) {
    for (const region of COVERAGE_REGIONS) {
      const inCell = conferences.filter(
        (c) => c.region === region && c.startDate <= quarter.endDate && c.endDate >= quarter.startDate,
      );
      cells.push({
        quarter,
        region,
        planned: inCell.filter((c) => c.status === 'planned' || c.status === 'attended'),
        candidates: inCell
          .filter((c) => c.status === 'considering' && (scores.get(c.id)?.tier ?? 'skip') !== 'skip')
          .sort((a, b) => (scores.get(b.id)?.score ?? 0) - (scores.get(a.id)?.score ?? 0)),
      });
    }
  }
  return cells;
}

/** Quarters × core regions with nothing planned. LATAM and IL are reported only when candidates exist. */
export function findGaps(cells: CoverageCell[]): Gap[] {
  const core: Region[] = ['EMEA', 'NA', 'APAC', 'MEA'];
  return cells
    .filter((cell) => cell.planned.length === 0)
    .filter((cell) => core.includes(cell.region) || cell.candidates.length > 0)
    .map((cell) => ({ ...cell, kind: cell.candidates.length > 0 ? 'no-plans' : 'no-events' }));
}

export interface Collision {
  a: Conference;
  b: Conference;
  distanceKm: number;
  gapDays: number;
  /** Rep ids assigned to both events. */
  sharedRepIds: string[];
}

/** Two Anchor-tier or planned events in the same week on different continents. */
export function findCollisions(conferences: Conference[], scores: Map<string, ScoreResult>): Collision[] {
  const strong = conferences.filter(
    (c) => c.status === 'planned' || (c.status !== 'skipped' && scores.get(c.id)?.tier === 'anchor'),
  );
  const out: Collision[] = [];
  for (let i = 0; i < strong.length; i++) {
    for (let j = i + 1; j < strong.length; j++) {
      const a = strong[i]!;
      const b = strong[j]!;
      const gap = gapDays(a, b);
      const km = haversineKm(a, b);
      if (gap <= 2 && km > 1500) {
        out.push({
          a,
          b,
          distanceKm: km,
          gapDays: gap,
          sharedRepIds: a.assignedRepIds.filter((r) => b.assignedRepIds.includes(r)),
        });
      }
    }
  }
  return out;
}

export interface RepLoad {
  rep: Rep;
  /** Planned events assigned to this rep, sorted by date. */
  events: Conference[];
  /** Busiest 21-day window: how many events and which. */
  peak: { count: number; events: Conference[]; windowStart: string };
  travelDays: number;
  nights: number;
}

export function repLoads(reps: Rep[], conferences: Conference[], homeBase: GeoPointLike & { label: string }): RepLoad[] {
  return reps.map((rep) => {
    const events = conferences
      .filter((c) => c.status === 'planned' && c.assignedRepIds.includes(rep.id))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    let peak: RepLoad['peak'] = { count: 0, events: [], windowStart: '' };
    for (const e of events) {
      const windowEnd = new Date(Date.parse(e.startDate) + 21 * 86_400_000).toISOString().slice(0, 10);
      const inWindow = events.filter((x) => x.startDate >= e.startDate && x.startDate <= windowEnd);
      if (inWindow.length > peak.count) peak = { count: inWindow.length, events: inWindow, windowStart: e.startDate };
    }
    const travel = events.map((c) => estimateTravel(c, eventDays(c.startDate, c.endDate), homeBase));
    return {
      rep,
      events,
      peak,
      travelDays: travel.reduce((a, t) => a + t.travelDays, 0),
      nights: travel.reduce((a, t) => a + t.nights, 0),
    };
  });
}

/** Anchor-tier events nobody is assigned to yet. */
export function unassignedAnchors(conferences: Conference[], scores: Map<string, ScoreResult>): Conference[] {
  return conferences.filter(
    (c) => c.status !== 'skipped' && c.status !== 'attended' && scores.get(c.id)?.tier === 'anchor' && c.assignedRepIds.length === 0,
  );
}

export function regionLabel(region: Region): string {
  return REGION_LABELS[region];
}
