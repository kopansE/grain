import type { Conference, GeoPoint, ScoreComponent, ScoreResult, ScoringWeights, Tier, Vertical } from './types';
import { daysBetween, estimateTravel, eventDays, haversineKm } from '@/lib/geo';

/**
 * ICP-fit scoring. Transparent on purpose: six components, each visible in
 * the UI with a one-line note, weights adjustable by the user. See
 * docs/PLAN.md §4 for the reasoning behind each component.
 */

export const DEFAULT_WEIGHTS: ScoringWeights = {
  verticalFit: 0.3,
  buyerDensity: 0.25,
  seniority: 0.15,
  reach: 0.1,
  cost: 0.1,
  trackRecord: 0.1,
};

export interface WeightPreset {
  id: string;
  label: string;
  blurb: string;
  weights: ScoringWeights;
}

export const WEIGHT_PRESETS: WeightPreset[] = [
  {
    id: 'pipeline',
    label: 'Pipeline first',
    blurb: 'Default. Buyers in the room beat everything else.',
    weights: DEFAULT_WEIGHTS,
  },
  {
    id: 'budget',
    label: 'Budget-conscious',
    blurb: 'Cost weighs more, reach weighs less.',
    weights: { verticalFit: 0.28, buyerDensity: 0.22, seniority: 0.12, reach: 0.05, cost: 0.25, trackRecord: 0.08 },
  },
  {
    id: 'brand',
    label: 'Brand & reach',
    blurb: 'Big rooms, even with fewer buyers per head.',
    weights: { verticalFit: 0.25, buyerDensity: 0.15, seniority: 0.1, reach: 0.3, cost: 0.1, trackRecord: 0.1 },
  },
  {
    id: 'treasury',
    label: 'Treasury focus',
    blurb: 'Agenda fit weighs hardest. Treasurers first.',
    weights: { verticalFit: 0.4, buyerDensity: 0.25, seniority: 0.15, reach: 0.05, cost: 0.05, trackRecord: 0.1 },
  },
];

export const WEIGHT_LABELS: Record<keyof ScoringWeights, { label: string; hint: string }> = {
  verticalFit: { label: 'Vertical fit', hint: 'How much of the agenda is payments, treasury, FX and cross-border.' },
  buyerDensity: { label: 'Buyer density', hint: 'Share of attendees who are PSPs, cross-border payment companies, travel wholesalers or treasurers.' },
  seniority: { label: 'Seniority', hint: 'Whether CFOs, treasurers and heads of payments actually show up.' },
  reach: { label: 'Reach', hint: 'Audience size, log-scaled so focused rooms are not punished.' },
  cost: { label: 'Cost efficiency', hint: 'Ticket plus travel from home base. Cheaper scores higher.' },
  trackRecord: { label: 'Track record', hint: 'Leads per day from past editions. Neutral when unknown.' },
};

/** How much each vertical tag is worth for Grain's ICP. */
export const VERTICAL_ICP_WEIGHT: Record<Vertical, number> = {
  payments: 1.0,
  treasury: 1.0,
  fintech: 0.8,
  travel: 0.8,
  banking: 0.6,
  ecommerce: 0.5,
  insurtech: 0.4,
  crypto: 0.3,
  saas: 0.2,
};

export const TIER_THRESHOLDS = { anchor: 75, cover: 58, opportunistic: 40 } as const;

export const CLUSTER_BONUS = { points: 8, maxGapDays: 7, maxDistanceKm: 1500 } as const;

/** Reach saturates at this audience size. */
const REACH_CEILING = 30_000;
/** Cost component hits zero at this all-in spend. */
const DEFAULT_COST_CEILING_USD = 12_000;
/** Track record saturates at this many leads per event day. */
const LEADS_PER_DAY_CEILING = 8;

export interface ScoringContext {
  weights: ScoringWeights;
  homeBase: GeoPoint;
  costCeilingUsd?: number;
}

export function tierFor(score: number): Tier {
  if (score >= TIER_THRESHOLDS.anchor) return 'anchor';
  if (score >= TIER_THRESHOLDS.cover) return 'cover';
  if (score >= TIER_THRESHOLDS.opportunistic) return 'opportunistic';
  return 'skip';
}

export function normalizeWeights(w: ScoringWeights): ScoringWeights {
  const total = Object.values(w).reduce((a, b) => a + Math.max(0, b), 0) || 1;
  return {
    verticalFit: Math.max(0, w.verticalFit) / total,
    buyerDensity: Math.max(0, w.buyerDensity) / total,
    seniority: Math.max(0, w.seniority) / total,
    reach: Math.max(0, w.reach) / total,
    cost: Math.max(0, w.cost) / total,
    trackRecord: Math.max(0, w.trackRecord) / total,
  };
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const fmtUsd = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

/** Score one conference in isolation (no cluster bonus). */
export function scoreConference(c: Conference, ctx: ScoringContext): ScoreResult {
  const w = normalizeWeights(ctx.weights);
  const days = eventDays(c.startDate, c.endDate);
  const components: ScoreComponent[] = [];

  // 1. Vertical fit: hand-estimated agenda fit, blended with the best vertical tag.
  const bestTag = c.verticals.reduce((m, v) => Math.max(m, VERTICAL_ICP_WEIGHT[v] ?? 0), 0);
  const verticalValue = clamp01(0.6 * (c.icpInputs.verticalFit / 10) + 0.4 * bestTag);
  components.push(
    component('verticalFit', w.verticalFit, verticalValue, `Agenda fit ${c.icpInputs.verticalFit}/10, tagged ${c.verticals.join(', ')}.`),
  );

  // 2. Buyer density.
  const buyerValue = clamp01(c.icpInputs.buyerDensity / 10);
  components.push(
    component('buyerDensity', w.buyerDensity, buyerValue, `About ${c.icpInputs.buyerDensity} in 10 attendees are PSPs, treasurers or travel wholesalers.`),
  );

  // 3. Seniority.
  const seniorityValue = clamp01(c.icpInputs.seniority / 10);
  components.push(
    component(
      'seniority',
      w.seniority,
      seniorityValue,
      c.icpInputs.seniority >= 7
        ? 'Decision-makers show up in person.'
        : c.icpInputs.seniority >= 4
          ? 'Mixed: practitioners with some budget holders.'
          : 'Mostly practitioners; few budget holders.',
    ),
  );

  // 4. Reach, log-scaled.
  const reachValue = clamp01(Math.log10(Math.max(1, c.audienceSize)) / Math.log10(REACH_CEILING));
  components.push(
    component('reach', w.reach, reachValue, `${c.audienceSize.toLocaleString('en-US')} attendees. Log-scaled so a focused room is not punished.`),
  );

  // 5. Cost efficiency: ticket + travel from home base.
  const travel = estimateTravel({ lat: c.lat, lng: c.lng }, days, ctx.homeBase);
  const allIn = c.costs.ticketUsd + travel.totalUsd;
  const costValue = 1 - clamp01(allIn / (ctx.costCeilingUsd ?? DEFAULT_COST_CEILING_USD));
  components.push(
    component(
      'cost',
      w.cost,
      costValue,
      `${fmtUsd(allIn)} all-in from ${ctx.homeBase.label} (${travel.bucket}, ${travel.nights} night${travel.nights === 1 ? '' : 's'}).`,
    ),
  );

  // 6. Track record: leads per event day from past editions; neutral when unknown.
  let trackValue = 0.5;
  let trackNote = 'No history yet. Neutral until the team logs leads here.';
  if (c.history && c.history.length > 0) {
    const totalLeads = c.history.reduce((a, h) => a + h.leads, 0);
    const leadsPerDay = totalLeads / (c.history.length * days);
    trackValue = clamp01(leadsPerDay / LEADS_PER_DAY_CEILING);
    const last = [...c.history].sort((a, b) => b.year - a.year)[0]!;
    trackNote = `${last.year}: ${last.leads} leads, ${fmtUsd(last.pipelineUsd)} pipeline. ${leadsPerDay.toFixed(1)} leads per day.`;
  }
  components.push(component('trackRecord', w.trackRecord, trackValue, trackNote));

  const base = Math.round(components.reduce((a, k) => a + k.contribution, 0));
  return { score: base, base, clusterBonus: 0, tier: tierFor(base), components };
}

function component(key: keyof ScoringWeights, weight: number, value: number, note: string): ScoreComponent {
  return { key, label: WEIGHT_LABELS[key].label, weight, value, contribution: weight * value * 100, note };
}

/** Gap in days between two date ranges; 0 when they overlap. */
export function gapDays(a: { startDate: string; endDate: string }, b: { startDate: string; endDate: string }): number {
  if (a.startDate <= b.endDate && b.startDate <= a.endDate) return 0;
  return a.endDate < b.startDate ? daysBetween(a.endDate, b.startDate) : daysBetween(b.endDate, a.startDate);
}

/**
 * Score every conference, then apply the cluster bonus: an Opportunistic
 * event close in time and space to an Anchor (any non-skipped status) or a
 * planned Cover event gets +8 and a "piggyback" badge. Marginal cost of a
 * second event on the same trip is a day, not a flight.
 */
export function scoreAll(conferences: Conference[], ctx: ScoringContext): Map<string, ScoreResult> {
  const results = new Map<string, ScoreResult>();
  for (const c of conferences) results.set(c.id, scoreConference(c, ctx));

  const anchors = conferences.filter((c) => {
    if (c.status === 'skipped') return false;
    const t = results.get(c.id)!.tier;
    return t === 'anchor' || (t === 'cover' && c.status === 'planned');
  });

  for (const c of conferences) {
    const r = results.get(c.id)!;
    if (r.tier !== 'opportunistic') continue;
    const host = anchors.find(
      (a) =>
        a.id !== c.id &&
        gapDays(a, c) <= CLUSTER_BONUS.maxGapDays &&
        haversineKm(a, c) <= CLUSTER_BONUS.maxDistanceKm,
    );
    if (!host) continue;
    const score = Math.min(100, r.base + CLUSTER_BONUS.points);
    results.set(c.id, { ...r, score, clusterBonus: CLUSTER_BONUS.points, piggybackOf: host.id, tier: tierFor(score) });
  }
  return results;
}

/** Counts per tier, for the little distribution bar under the sliders. */
export function tierCounts(results: Iterable<ScoreResult>): Record<Tier, number> {
  const out: Record<Tier, number> = { anchor: 0, cover: 0, opportunistic: 0, skip: 0 };
  for (const r of results) out[r.tier]++;
  return out;
}
