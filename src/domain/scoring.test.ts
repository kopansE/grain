import { describe, expect, it } from 'vitest';
import type { Conference } from './types';
import { DEFAULT_WEIGHTS, WEIGHT_PRESETS, gapDays, normalizeWeights, scoreAll, scoreConference, tierFor } from './scoring';
import { HOME_BASES } from '@/lib/geo';

export function conf(overrides: Partial<Conference> & { id: string }): Conference {
  return {
    series: overrides.id,
    name: overrides.id,
    startDate: '2027-03-10',
    endDate: '2027-03-11',
    city: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
    region: 'EMEA',
    lat: 51.5,
    lng: -0.12,
    verticals: ['payments'],
    audienceSize: 5000,
    description: '',
    icpInputs: { verticalFit: 7, buyerDensity: 6, seniority: 6 },
    costs: { ticketUsd: 1500 },
    status: 'considering',
    assignedRepIds: [],
    source: 'seed',
    datesConfirmed: true,
    ...overrides,
  };
}

const ctx = { weights: DEFAULT_WEIGHTS, homeBase: HOME_BASES.TLV };

describe('normalizeWeights', () => {
  it('sums to one and ignores negatives', () => {
    const w = normalizeWeights({ verticalFit: 2, buyerDensity: 2, seniority: 0, reach: 0, cost: -5, trackRecord: 0 });
    expect(w.verticalFit).toBeCloseTo(0.5);
    expect(w.buyerDensity).toBeCloseTo(0.5);
    expect(w.cost).toBe(0);
  });
  it('every preset sums to one', () => {
    for (const p of WEIGHT_PRESETS) {
      const total = Object.values(p.weights).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(1, 5);
    }
  });
});

describe('scoreConference', () => {
  it('produces six components whose contributions sum to the base score', () => {
    const r = scoreConference(conf({ id: 'a' }), ctx);
    expect(r.components).toHaveLength(6);
    const sum = r.components.reduce((a, c) => a + c.contribution, 0);
    expect(Math.round(sum)).toBe(r.base);
    expect(r.score).toBe(r.base);
    expect(r.clusterBonus).toBe(0);
  });

  it('a focused treasury summit beats a huge general SaaS show', () => {
    const treasury = conf({
      id: 'treasury',
      verticals: ['treasury'],
      audienceSize: 2000,
      icpInputs: { verticalFit: 10, buyerDensity: 9, seniority: 9 },
    });
    const saas = conf({
      id: 'saas',
      verticals: ['saas'],
      audienceSize: 70000,
      icpInputs: { verticalFit: 1, buyerDensity: 1, seniority: 4 },
    });
    const t = scoreConference(treasury, ctx);
    const s = scoreConference(saas, ctx);
    expect(t.score).toBeGreaterThan(s.score + 30);
    expect(t.tier).toBe('anchor');
    expect(s.tier).toBe('skip');
  });

  it('reach is log-scaled: 10x the audience adds far less than 10x the value', () => {
    const small = scoreConference(conf({ id: 's', audienceSize: 3000 }), ctx).components.find((c) => c.key === 'reach')!;
    const big = scoreConference(conf({ id: 'b', audienceSize: 30000 }), ctx).components.find((c) => c.key === 'reach')!;
    expect(big.value).toBe(1);
    expect(small.value).toBeGreaterThan(0.7);
  });

  it('farther events cost more and score lower on the cost component', () => {
    const london = scoreConference(conf({ id: 'l' }), ctx).components.find((c) => c.key === 'cost')!;
    const vegas = scoreConference(conf({ id: 'v', lat: 36.17, lng: -115.14 }), ctx).components.find((c) => c.key === 'cost')!;
    expect(london.value).toBeGreaterThan(vegas.value);
    expect(vegas.note).toContain('ultra long haul');
  });

  it('track record is neutral without history and rewards leads per day', () => {
    const none = scoreConference(conf({ id: 'n' }), ctx).components.find((c) => c.key === 'trackRecord')!;
    expect(none.value).toBe(0.5);
    const good = scoreConference(conf({ id: 'g', history: [{ year: 2025, leads: 20, pipelineUsd: 300000 }] }), ctx).components.find(
      (c) => c.key === 'trackRecord',
    )!;
    expect(good.value).toBeGreaterThan(0.5);
    expect(good.note).toContain('2025');
  });

  it('changing weights changes the ranking', () => {
    const cheapLocal = conf({ id: 'local', lat: 32.08, lng: 34.78, audienceSize: 800, icpInputs: { verticalFit: 6, buyerDensity: 5, seniority: 5 }, costs: { ticketUsd: 300 } });
    const bigFar = conf({ id: 'far', lat: 36.17, lng: -115.14, audienceSize: 30000, icpInputs: { verticalFit: 7, buyerDensity: 6, seniority: 6 }, costs: { ticketUsd: 3000 } });
    const budget = WEIGHT_PRESETS.find((p) => p.id === 'budget')!.weights;
    const brand = WEIGHT_PRESETS.find((p) => p.id === 'brand')!.weights;
    const underBudget = scoreConference(cheapLocal, { ...ctx, weights: budget }).score - scoreConference(bigFar, { ...ctx, weights: budget }).score;
    const underBrand = scoreConference(cheapLocal, { ...ctx, weights: brand }).score - scoreConference(bigFar, { ...ctx, weights: brand }).score;
    expect(underBudget).toBeGreaterThan(underBrand);
  });
});

describe('tierFor', () => {
  it('maps thresholds', () => {
    expect(tierFor(75)).toBe('anchor');
    expect(tierFor(74)).toBe('cover');
    expect(tierFor(58)).toBe('cover');
    expect(tierFor(57)).toBe('opportunistic');
    expect(tierFor(40)).toBe('opportunistic');
    expect(tierFor(39)).toBe('skip');
  });
});

describe('gapDays', () => {
  it('is zero for overlapping ranges and counts days otherwise', () => {
    expect(gapDays({ startDate: '2027-03-10', endDate: '2027-03-12' }, { startDate: '2027-03-11', endDate: '2027-03-13' })).toBe(0);
    expect(gapDays({ startDate: '2027-03-10', endDate: '2027-03-12' }, { startDate: '2027-03-15', endDate: '2027-03-16' })).toBe(3);
    expect(gapDays({ startDate: '2027-03-15', endDate: '2027-03-16' }, { startDate: '2027-03-10', endDate: '2027-03-12' })).toBe(3);
  });
});

describe('scoreAll cluster bonus', () => {
  it('bumps an opportunistic event that sits next to an anchor', () => {
    const anchor = conf({ id: 'anchor', icpInputs: { verticalFit: 10, buyerDensity: 9, seniority: 9 }, verticals: ['treasury'] });
    const small = conf({
      id: 'small',
      startDate: '2027-03-14',
      endDate: '2027-03-14',
      verticals: ['ecommerce'],
      audienceSize: 1500,
      icpInputs: { verticalFit: 4, buyerDensity: 3, seniority: 4 },
    });
    const far = conf({ ...small, id: 'far', lat: 1.35, lng: 103.8 }); // Singapore, same week
    const results = scoreAll([anchor, small, far], ctx);
    expect(results.get('anchor')!.tier).toBe('anchor');
    const s = results.get('small')!;
    expect(s.base).toBeGreaterThanOrEqual(40);
    expect(s.base).toBeLessThan(58);
    expect(s.clusterBonus).toBe(8);
    expect(s.piggybackOf).toBe('anchor');
    expect(s.score).toBe(s.base + 8);
    const f = results.get('far')!;
    expect(f.clusterBonus).toBe(0);
    expect(f.piggybackOf).toBeUndefined();
  });

  it('does not piggyback on a skipped anchor', () => {
    const anchor = conf({ id: 'anchor', status: 'skipped', icpInputs: { verticalFit: 10, buyerDensity: 9, seniority: 9 }, verticals: ['treasury'] });
    const small = conf({ id: 'small', startDate: '2027-03-14', endDate: '2027-03-14', verticals: ['ecommerce'], audienceSize: 1500, icpInputs: { verticalFit: 4, buyerDensity: 3, seniority: 4 } });
    const results = scoreAll([anchor, small], ctx);
    expect(results.get('small')!.clusterBonus).toBe(0);
  });
});
