import type { GeoPoint, HomeBaseCode } from '@/domain/types';

export type GeoPointLike = { lat: number; lng: number };

export const HOME_BASES: Record<HomeBaseCode, GeoPoint> = {
  TLV: { lat: 32.0853, lng: 34.7818, label: 'Tel Aviv' },
  NYC: { lat: 40.7128, lng: -74.006, label: 'New York' },
  LON: { lat: 51.5074, lng: -0.1278, label: 'London' },
};

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

export interface TravelEstimate {
  distanceKm: number;
  flightUsd: number;
  hotelUsd: number;
  nights: number;
  /** Whole days lost to travel, both directions. */
  travelDays: number;
  totalUsd: number;
  /** Plain-English bucket for the UI, e.g. "short haul". */
  bucket: 'local' | 'short haul' | 'medium haul' | 'long haul' | 'ultra long haul';
}

/**
 * Rough, defensible travel cost from a home base. Buckets by distance rather
 * than pretending to know airfares; the point is relative ranking, not
 * expense reports. Hotel is a flat nightly rate times event nights plus one.
 */
export function estimateTravel(
  destination: { lat: number; lng: number },
  eventDays: number,
  base: GeoPoint = HOME_BASES.TLV,
  nightlyRateUsd = 260,
): TravelEstimate {
  const distanceKm = haversineKm(base, destination);
  let flightUsd: number;
  let bucket: TravelEstimate['bucket'];
  let travelDays: number;
  if (distanceKm < 300) {
    flightUsd = 0;
    bucket = 'local';
    travelDays = 0;
  } else if (distanceKm < 2500) {
    flightUsd = 450;
    bucket = 'short haul';
    travelDays = 1;
  } else if (distanceKm < 5000) {
    flightUsd = 700;
    bucket = 'medium haul';
    travelDays = 1;
  } else if (distanceKm < 9000) {
    flightUsd = 1100;
    bucket = 'long haul';
    travelDays = 2;
  } else {
    flightUsd = 1600;
    bucket = 'ultra long haul';
    travelDays = 2;
  }
  const nights = bucket === 'local' ? 0 : Math.max(1, eventDays) + 1;
  const hotelUsd = nights * nightlyRateUsd;
  return { distanceKm, flightUsd, hotelUsd, nights, travelDays, totalUsd: flightUsd + hotelUsd, bucket };
}

/** Inclusive day count between two ISO dates. */
export function eventDays(startDate: string, endDate: string): number {
  const ms = Date.parse(endDate) - Date.parse(startDate);
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

/** Flag emoji from an ISO 3166-1 alpha-2 code. */
export function flagEmoji(countryCode: string): string {
  const cc = countryCode.toUpperCase();
  if (cc.length !== 2) return '';
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
