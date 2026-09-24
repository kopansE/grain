import { describe, expect, it } from 'vitest';
import { conf } from './scoring.test';
import { DEFAULT_WEIGHTS, scoreAll } from './scoring';
import { coverageGrid, findClusters, findCollisions, findGaps, quartersFrom, repLoads, unassignedAnchors } from './clustering';
import { HOME_BASES } from '@/lib/geo';
import type { Rep } from './types';

const ctx = { weights: DEFAULT_WEIGHTS, homeBase: HOME_BASES.TLV };
const strong = { verticalFit: 9, buyerDensity: 8, seniority: 8 };

describe('findClusters', () => {
  it('groups events close in time and space and computes savings', () => {
    const a = conf({ id: 'ams-1', city: 'Amsterdam', lat: 52.37, lng: 4.9, startDate: '2027-06-01', endDate: '2027-06-03', icpInputs: strong, verticals: ['treasury'] });
    const b = conf({ id: 'ams-2', city: 'Amsterdam', lat: 52.37, lng: 4.9, startDate: '2027-06-05', endDate: '2027-06-06' });
    const c = conf({ id: 'sg', city: 'Singapore', lat: 1.35, lng: 103.8, startDate: '2027-06-05', endDate: '2027-06-06' });
    const d = conf({ id: 'ams-later', city: 'Amsterdam', lat: 52.37, lng: 4.9, startDate: '2027-09-01', endDate: '2027-09-02' });
    const all = [a, b, c, d];
    const clusters = findClusters(all, scoreAll(all, ctx), { homeBase: HOME_BASES.TLV });
    expect(clusters).toHaveLength(1);
    const k = clusters[0]!;
    expect(k.label).toBe('Amsterdam run');
    expect(k.conferenceIds[0]).toBe('ams-1'); // strongest first
    expect(k.conferenceIds).toContain('ams-2');
    expect(k.conferenceIds).not.toContain('sg');
    expect(k.savings.flightsSaved).toBe(1);
    expect(k.savings.extraNights).toBe(0);
    expect(k.savings.usd).toBe(700); // one medium-haul flight (TLV to Amsterdam)
    expect(k.savings.travelDays).toBe(1);
    expect(k.spanDays).toBe(6);
    expect(k.fullyPlanned).toBe(false);
  });

  it('reports a longer gap honestly: travel days saved, hotel costs more', () => {
    const a = conf({ id: 'ams-1', city: 'Amsterdam', lat: 52.37, lng: 4.9, startDate: '2027-06-01', endDate: '2027-06-03' });
    const b = conf({ id: 'ams-2', city: 'Amsterdam', lat: 52.37, lng: 4.9, startDate: '2027-06-08', endDate: '2027-06-09' });
    const k = findClusters([a, b], scoreAll([a, b], ctx), { homeBase: HOME_BASES.TLV })[0]!;
    expect(k.savings.extraNights).toBe(3);
    expect(k.savings.usd).toBeLessThan(0);
    expect(k.savings.travelDays).toBe(1);
  });

  it('labels multi-city clusters as a swing', () => {
    const a = conf({ id: 'lon', city: 'London', startDate: '2027-03-01', endDate: '2027-03-02' });
    const b = conf({ id: 'par', city: 'Paris', lat: 48.85, lng: 2.35, startDate: '2027-03-04', endDate: '2027-03-05' });
    const clusters = findClusters([a, b], scoreAll([a, b], ctx), { homeBase: HOME_BASES.TLV });
    expect(clusters[0]!.label).toBe('London + Paris swing');
  });
});

describe('quartersFrom / coverageGrid / findGaps', () => {
  it('builds four consecutive quarters', () => {
    const q = quartersFrom('2026-11-15');
    expect(q.map((x) => x.id)).toEqual(['2026-Q4', '2027-Q1', '2027-Q2', '2027-Q3']);
    expect(q[0]!.startDate).toBe('2026-10-01');
    expect(q[0]!.endDate).toBe('2026-12-31');
  });

  it('flags a quarter/region with candidates but no plans, and one with nothing at all', () => {
    const planned = conf({ id: 'p', region: 'EMEA', status: 'planned', startDate: '2026-11-10', endDate: '2026-11-11' });
    const apacCandidate = conf({ id: 'a', region: 'APAC', lat: 1.35, lng: 103.8, startDate: '2027-02-10', endDate: '2027-02-11', icpInputs: strong });
    const all = [planned, apacCandidate];
    const cells = coverageGrid(all, scoreAll(all, ctx), '2026-10-01');
    const gaps = findGaps(cells);
    const q4emea = gaps.find((g) => g.quarter.id === '2026-Q4' && g.region === 'EMEA');
    expect(q4emea).toBeUndefined();
    const q1apac = gaps.find((g) => g.quarter.id === '2027-Q1' && g.region === 'APAC')!;
    expect(q1apac.kind).toBe('no-plans');
    expect(q1apac.candidates[0]!.id).toBe('a');
    const q3apac = gaps.find((g) => g.quarter.id === '2027-Q3' && g.region === 'APAC')!;
    expect(q3apac.kind).toBe('no-events');
    // LATAM with no events is not reported as a gap
    expect(gaps.find((g) => g.region === 'LATAM')).toBeUndefined();
  });
});

describe('findCollisions', () => {
  it('finds two strong events in the same week on different continents', () => {
    const vegas = conf({ id: 'v', city: 'Las Vegas', lat: 36.17, lng: -115.14, startDate: '2027-06-01', endDate: '2027-06-03', status: 'planned', assignedRepIds: ['noa'] });
    const ams = conf({ id: 'a', city: 'Amsterdam', lat: 52.37, lng: 4.9, startDate: '2027-06-02', endDate: '2027-06-04', status: 'planned', assignedRepIds: ['noa', 'tom'] });
    // A weak, unplanned London event the same week is not a collision.
    const lon = conf({ id: 'l', city: 'London', startDate: '2027-06-02', endDate: '2027-06-03', verticals: ['saas'], icpInputs: { verticalFit: 1, buyerDensity: 1, seniority: 2 } });
    const all = [vegas, ams, lon];
    const collisions = findCollisions(all, scoreAll(all, ctx));
    expect(collisions).toHaveLength(1);
    expect(collisions[0]!.sharedRepIds).toEqual(['noa']);
    expect(collisions[0]!.distanceKm).toBeGreaterThan(1500);
  });
});

describe('repLoads / unassignedAnchors', () => {
  const reps: Rep[] = [{ id: 'noa', name: 'Noa', initials: 'NB', color: '#fff', homeBase: 'TLV', role: '' }];
  it('finds the busiest 21-day window per rep', () => {
    const e1 = conf({ id: 'e1', status: 'planned', assignedRepIds: ['noa'], startDate: '2027-03-01', endDate: '2027-03-02' });
    const e2 = conf({ id: 'e2', status: 'planned', assignedRepIds: ['noa'], startDate: '2027-03-10', endDate: '2027-03-11' });
    const e3 = conf({ id: 'e3', status: 'planned', assignedRepIds: ['noa'], startDate: '2027-03-18', endDate: '2027-03-19' });
    const e4 = conf({ id: 'e4', status: 'planned', assignedRepIds: ['noa'], startDate: '2027-06-01', endDate: '2027-06-02' });
    const loads = repLoads(reps, [e1, e2, e3, e4], HOME_BASES.TLV);
    expect(loads[0]!.events).toHaveLength(4);
    expect(loads[0]!.peak.count).toBe(3);
    expect(loads[0]!.peak.windowStart).toBe('2027-03-01');
  });
  it('lists anchors with nobody assigned', () => {
    const a = conf({ id: 'a', icpInputs: strong, verticals: ['treasury'] });
    const b = conf({ id: 'b', icpInputs: strong, verticals: ['treasury'], assignedRepIds: ['noa'] });
    const all = [a, b];
    expect(unassignedAnchors(all, scoreAll(all, ctx)).map((c) => c.id)).toEqual(['a']);
  });
});
