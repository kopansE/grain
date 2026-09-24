import type { Conference, GeoPoint, ScoreResult, Tier } from '@/domain/types';
import type { Cluster } from '@/domain/clustering';
import { fmtDateRange } from '@/lib/format';
import { TIER_LABELS } from '@/domain/types';

export const TIER_HEX: Record<Tier, string> = {
  anchor: '#e8a94a',
  cover: '#5ecbb8',
  opportunistic: '#8593f5',
  skip: '#5b6376',
};

export interface GlobePoint {
  id: string;
  lat: number;
  lng: number;
  color: string;
  altitude: number;
  radius: number;
  label: string;
  kind: 'conference' | 'home';
}

export interface GlobeArc {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: [string, string];
}

export interface GlobeRing {
  id: string;
  lat: number;
  lng: number;
  label: string;
}

export interface GlobeLabel {
  id: string;
  lat: number;
  lng: number;
  text: string;
  size: number;
  color: string;
}

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildPoints(conferences: Conference[], scores: Map<string, ScoreResult>, home: GeoPoint): GlobePoint[] {
  const pts: GlobePoint[] = conferences
    .filter((c) => c.status !== 'skipped')
    .map((c) => {
      const r = scores.get(c.id);
      const tier = r?.tier ?? 'skip';
      const planned = c.status === 'planned';
      return {
        id: c.id,
        lat: c.lat,
        lng: c.lng,
        color: TIER_HEX[tier],
        altitude: 0.006 + Math.min(0.03, Math.log10(Math.max(100, c.audienceSize)) / 160),
        radius: planned ? 0.55 : tier === 'anchor' ? 0.42 : 0.3,
        kind: 'conference',
        label: `<div style="font:12px/1.35 Inter,sans-serif;color:#e9ebf1;background:rgba(16,19,26,.94);border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:8px 10px;max-width:240px;box-shadow:0 12px 30px -10px rgba(0,0,0,.8)">
  <div style="font-weight:600">${escape(c.name)}</div>
  <div style="color:#9aa3b8;margin-top:2px">${fmtDateRange(c.startDate, c.endDate)} · ${escape(c.city)}</div>
  <div style="margin-top:5px;display:flex;gap:6px;align-items:center">
    <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${TIER_HEX[tier]}"></span>
    <span style="color:${TIER_HEX[tier]};font-weight:600;font-size:11px;letter-spacing:.06em;text-transform:uppercase">${TIER_LABELS[tier]}</span>
    <span style="color:#9aa3b8;font-size:11px">· score ${r?.score ?? '–'}${planned ? ' · planned' : ''}</span>
  </div>
</div>`,
      };
    });
  pts.push({
    id: 'home',
    lat: home.lat,
    lng: home.lng,
    color: '#ffffff',
    altitude: 0.012,
    radius: 0.4,
    kind: 'home',
    label: `<div style="font:12px Inter,sans-serif;color:#e9ebf1;background:rgba(16,19,26,.94);border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:6px 10px">Home base · ${escape(home.label)}</div>`,
  });
  return pts;
}

export function buildArcs(conferences: Conference[], home: GeoPoint, today: string): GlobeArc[] {
  return conferences
    .filter((c) => c.status === 'planned' && c.endDate >= today)
    .map((c) => ({
      id: c.id,
      startLat: home.lat,
      startLng: home.lng,
      endLat: c.lat,
      endLng: c.lng,
      color: ['rgba(232,169,74,0.95)', 'rgba(94,203,184,0.95)'],
    }));
}

export function buildRings(clusters: Cluster[]): GlobeRing[] {
  return clusters.map((k) => ({ id: k.id, lat: k.centroid.lat, lng: k.centroid.lng, label: k.label }));
}

export function buildLabels(conferences: Conference[], home: GeoPoint, today: string): GlobeLabel[] {
  const out: GlobeLabel[] = conferences
    .filter((c) => c.status === 'planned' && c.endDate >= today)
    .map((c) => ({ id: c.id, lat: c.lat, lng: c.lng, text: c.series, size: 0.85, color: 'rgba(233,235,241,0.9)' }));
  out.push({ id: 'home', lat: home.lat, lng: home.lng, text: home.label, size: 0.9, color: 'rgba(255,255,255,0.95)' });
  return out;
}
