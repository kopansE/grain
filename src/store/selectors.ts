import { useMemo } from 'react';
import { useData } from './data';
import { useSettings } from './settings';
import { scoreAll } from '@/domain/scoring';
import type { ArcAssessment, Conference, Contact, Encounter, ScoreResult } from '@/domain/types';
import { classifyArc } from '@/domain/matching/arc';
import { coverageGrid, findClusters, findCollisions, findGaps, repLoads, unassignedAnchors, type Cluster, type Collision, type Gap, type RepLoad } from '@/domain/clustering';

/** Today's date as ISO, computed once per hour so memoized selectors stay stable. */
export function useToday(): string {
  return useMemo(() => new Date().toISOString().slice(0, 10), []);
}

export function useScores(): Map<string, ScoreResult> {
  const conferences = useData((s) => s.conferences);
  const weights = useSettings((s) => s.weights);
  const homeBase = useSettings((s) => s.homeBase);
  return useMemo(() => scoreAll(conferences, { weights, homeBase }), [conferences, weights, homeBase]);
}

export function useConference(id?: string): Conference | undefined {
  return useData((s) => (id ? s.conferences.find((c) => c.id === id) : undefined));
}

/** Conferences on or after today, i.e. the planning horizon. */
export function useUpcoming(): Conference[] {
  const conferences = useData((s) => s.conferences);
  const today = useToday();
  return useMemo(() => conferences.filter((c) => c.endDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate)), [conferences, today]);
}

export function useConferenceNameLookup(): (id: string) => string {
  const conferences = useData((s) => s.conferences);
  return useMemo(() => {
    const map = new Map(conferences.map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) ?? id;
  }, [conferences]);
}

export function useArcs(): Map<string, ArcAssessment> {
  const contacts = useData((s) => s.contacts);
  const encounters = useData((s) => s.encounters);
  const nameOf = useConferenceNameLookup();
  const today = useToday();
  return useMemo(() => {
    const out = new Map<string, ArcAssessment>();
    for (const c of contacts) {
      if (c.encounterIds.length === 0) continue;
      out.set(c.id, classifyArc(c, encounters, { now: today, conferenceName: nameOf }));
    }
    return out;
  }, [contacts, encounters, nameOf, today]);
}

export function useContact(id?: string): Contact | undefined {
  return useData((s) => (id ? s.contacts.find((c) => c.id === id) : undefined));
}

export function useEncountersFor(contactId?: string): Encounter[] {
  const encounters = useData((s) => s.encounters);
  return useMemo(
    () => (contactId ? encounters.filter((e) => e.contactId === contactId).sort((a, b) => a.capturedAt.localeCompare(b.capturedAt)) : []),
    [encounters, contactId],
  );
}

export interface PlanningInsights {
  clusters: Cluster[];
  gaps: Gap[];
  collisions: Collision[];
  loads: RepLoad[];
  unassigned: Conference[];
  grid: ReturnType<typeof coverageGrid>;
}

export function usePlanningInsights(): PlanningInsights {
  const upcoming = useUpcoming();
  const scores = useScores();
  const reps = useData((s) => s.reps);
  const homeBase = useSettings((s) => s.homeBase);
  const today = useToday();
  return useMemo(() => {
    const grid = coverageGrid(upcoming, scores, today);
    return {
      clusters: findClusters(upcoming, scores, { homeBase, maxDistanceKm: 1000 }),
      gaps: findGaps(grid),
      collisions: findCollisions(upcoming, scores),
      loads: repLoads(reps, upcoming, homeBase),
      unassigned: unassignedAnchors(upcoming, scores),
      grid,
    };
  }, [upcoming, scores, reps, homeBase, today]);
}

/** The conference happening today, else the next one starting, for show-floor mode. */
export function useCurrentConference(): Conference | undefined {
  const upcoming = useUpcoming();
  const today = useToday();
  return useMemo(() => {
    const live = upcoming.find((c) => c.startDate <= today && c.endDate >= today && c.status !== 'skipped');
    if (live) return live;
    return upcoming.find((c) => c.status === 'planned') ?? upcoming[0];
  }, [upcoming, today]);
}
