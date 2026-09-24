// Prints the seed conference ranking with the default weights, from Tel Aviv.
// Run: npx -y tsx scripts/rank.ts
import { SEED_CONFERENCES } from '../src/data/seed/conferences';
import { DEFAULT_WEIGHTS, scoreAll, tierCounts } from '../src/domain/scoring';
import { coverageGrid, findClusters, findCollisions, findGaps, unassignedAnchors } from '../src/domain/clustering';
import { HOME_BASES } from '../src/lib/geo';

const upcoming = SEED_CONFERENCES.filter((c) => c.startDate >= '2026-10-01');
const scores = scoreAll(SEED_CONFERENCES, { weights: DEFAULT_WEIGHTS, homeBase: HOME_BASES.TLV });

const rows = upcoming
  .map((c) => ({ c, r: scores.get(c.id)! }))
  .sort((a, b) => b.r.score - a.r.score);

console.log('score  tier           status       id'.padEnd(70) + 'components (vf/bd/sen/reach/cost/track)');
for (const { c, r } of rows) {
  const comps = r.components.map((k) => Math.round(k.contribution)).join('/');
  const bonus = r.piggybackOf ? ` (+${r.clusterBonus} via ${r.piggybackOf})` : '';
  console.log(`${String(r.score).padStart(5)}  ${r.tier.padEnd(14)} ${c.status.padEnd(12)} ${(c.id + bonus).padEnd(45)} ${comps}`);
}
console.log('\ntiers:', tierCounts(rows.map((x) => x.r)));

const clusters = findClusters(upcoming, scores, { homeBase: HOME_BASES.TLV, maxDistanceKm: 1000 });
console.log('\nclusters:');
for (const k of clusters) console.log(`  ${k.label}: ${k.conferenceIds.join(' + ')} | ${k.startDate}..${k.endDate} | saves ${k.savings.travelDays} travel days, $${k.savings.usd}`);

console.log('\ngaps:');
for (const g of findGaps(coverageGrid(upcoming, scores, '2026-10-01'))) console.log(`  ${g.quarter.label} ${g.region}: ${g.kind} ${g.candidates.slice(0, 3).map((c) => c.id).join(', ')}`);

console.log('\ncollisions:');
for (const k of findCollisions(upcoming, scores)) console.log(`  ${k.a.id} vs ${k.b.id} | gap ${k.gapDays}d | ${Math.round(k.distanceKm)} km | shared reps: ${k.sharedRepIds.join(',') || 'none'}`);

console.log('\nunassigned anchors:', unassignedAnchors(upcoming, scores).map((c) => c.id).join(', '));
