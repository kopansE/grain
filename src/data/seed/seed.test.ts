import { describe, expect, it } from 'vitest';
import { SEED_CONFERENCES, SEED_CONTACTS, SEED_ENCOUNTERS, SEED_REPS } from './index';
import { DEFAULT_WEIGHTS, scoreAll, tierCounts } from '@/domain/scoring';
import { coverageGrid, findClusters, findCollisions, findGaps, unassignedAnchors } from '@/domain/clustering';
import { classifyArc } from '@/domain/matching/arc';
import { HOME_BASES } from '@/lib/geo';

const ctx = { weights: DEFAULT_WEIGHTS, homeBase: HOME_BASES.TLV };
const scores = scoreAll(SEED_CONFERENCES, ctx);
const byId = (id: string) => SEED_CONFERENCES.find((c) => c.id === id)!;

describe('seed integrity', () => {
  it('ids are unique and references resolve', () => {
    const confIds = new Set(SEED_CONFERENCES.map((c) => c.id));
    expect(confIds.size).toBe(SEED_CONFERENCES.length);
    const contactIds = new Set(SEED_CONTACTS.map((c) => c.id));
    expect(contactIds.size).toBe(SEED_CONTACTS.length);
    const repIds = new Set(SEED_REPS.map((r) => r.id));
    for (const e of SEED_ENCOUNTERS) {
      expect(confIds.has(e.conferenceId), `conference ${e.conferenceId} for ${e.id}`).toBe(true);
      expect(contactIds.has(e.contactId), `contact ${e.contactId} for ${e.id}`).toBe(true);
      expect(repIds.has(e.repId), `rep ${e.repId} for ${e.id}`).toBe(true);
      const conf = byId(e.conferenceId);
      const day = e.capturedAt.slice(0, 10);
      expect(day >= conf.startDate && day <= conf.endDate, `${e.id} captured outside ${conf.name}`).toBe(true);
    }
    for (const c of SEED_CONFERENCES) {
      for (const r of c.assignedRepIds) expect(repIds.has(r)).toBe(true);
      expect(c.startDate <= c.endDate).toBe(true);
    }
  });
});

describe('seed scoring sanity (default weights, from Tel Aviv)', () => {
  it('ranks the treasury flagship and airline finance at the top and general tech at the bottom', () => {
    expect(scores.get('eurofinance-itm-2027')!.tier).toBe('anchor');
    expect(scores.get('iata-wfs-2026')!.tier).toBe('anchor');
    expect(scores.get('m2020-europe-2027')!.tier).toBe('anchor');
    expect(scores.get('saastr-annual-2027')!.tier).toBe('skip');
    expect(scores.get('slush-2026')!.tier).toBe('skip');
    expect(scores.get('techcrunch-disrupt-2026')!.tier).toBe('skip');
  });

  it('has a sensible tier distribution', () => {
    const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
    if (env?.PRINT_RANKING) {
      const rows = [...SEED_CONFERENCES]
        .filter((c) => c.startDate >= '2026-10-01')
        .map((c) => ({ id: c.id, ...scores.get(c.id)! }))
        .sort((a, b) => b.score - a.score)
        .map((r) => `${String(r.score).padStart(3)}  ${r.tier.padEnd(13)} ${r.piggybackOf ? '+8 via ' + r.piggybackOf : ''}`.padEnd(48) + r.id);
      console.log('\n' + rows.join('\n'));
    }
    const counts = tierCounts(scores.values());
    expect(counts.anchor).toBeGreaterThanOrEqual(6);
    expect(counts.cover).toBeGreaterThanOrEqual(8);
    expect(counts.opportunistic).toBeGreaterThanOrEqual(5);
    expect(counts.skip).toBeGreaterThanOrEqual(4);
  });

  it('produces clusters, at least one gap, and one collision', () => {
    const upcoming = SEED_CONFERENCES.filter((c) => c.startDate >= '2026-10-01');
    const clusters = findClusters(upcoming, scores, { homeBase: HOME_BASES.TLV, maxDistanceKm: 1000 });
    expect(clusters.length).toBeGreaterThanOrEqual(2);
    const gaps = findGaps(coverageGrid(upcoming, scores, '2026-10-01'));
    expect(gaps.length).toBeGreaterThanOrEqual(1);
    const collisions = findCollisions(upcoming, scores);
    expect(collisions.length).toBeGreaterThanOrEqual(1);
    expect(collisions.some((k) => k.sharedRepIds.length > 0)).toBe(true);
    expect(unassignedAnchors(upcoming, scores).length).toBeGreaterThanOrEqual(1);
  });
});

describe('seed relationship arcs', () => {
  const now = '2026-09-24';
  const arcOf = (id: string) => classifyArc(SEED_CONTACTS.find((c) => c.id === id)!, SEED_ENCOUNTERS, { now });
  it('covers every class', () => {
    expect(arcOf('c-priya-raman').classification).toBe('tire-kicker');
    expect(arcOf('c-hannah-schmidt').classification).toBe('tire-kicker');
    expect(arcOf('c-ivan-petrov').classification).toBe('tire-kicker');
    expect(arcOf('c-omar-haddad').classification).toBe('job-change');
    expect(arcOf('c-nadia-hussain').classification).toBe('warming');
    expect(arcOf('c-sarah-chen').classification).toBe('warming');
    expect(arcOf('c-carlos-mendes').classification).toBe('warming');
    expect(arcOf('c-elena-petrova').classification).toBe('stalled');
    expect(arcOf('c-mark-thompson').classification).toBe('stalled');
    expect(arcOf('c-lukas-weber').classification).toBe('new');
  });
});
