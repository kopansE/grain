import { useEffect, useMemo, useRef, useState } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import type { Conference, GeoPoint, ScoreResult } from '@/domain/types';
import type { Cluster } from '@/domain/clustering';
import { buildArcs, buildLabels, buildPoints, buildRings, type GlobeArc, type GlobeLabel, type GlobePoint, type GlobeRing } from './data';

export interface GlobeHeroProps {
  conferences: Conference[];
  scores: Map<string, ScoreResult>;
  clusters: Cluster[];
  homeBase: GeoPoint;
  today: string;
  onSelect: (conferenceId: string) => void;
  /** Fly to this conference when it changes. */
  focusId?: string;
}

export default function GlobeHero({ conferences, scores, clusters, homeBase, today, onSelect, focusId }: GlobeHeroProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const points = useMemo(() => buildPoints(conferences, scores, homeBase), [conferences, scores, homeBase]);
  const arcs = useMemo(() => buildArcs(conferences, homeBase, today), [conferences, homeBase, today]);
  const rings = useMemo(() => buildRings(clusters), [clusters]);
  const labels = useMemo(() => buildLabels(conferences, homeBase, today), [conferences, homeBase, today]);

  const setAutoRotate = (on: boolean) => {
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls();
    controls.autoRotate = on;
  };

  const onReady = () => {
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.45;
    controls.enableZoom = false;
    controls.enablePan = false;
    g.pointOfView({ lat: 26, lng: 22, altitude: 2.05 }, 0);
    setReady(true);
  };

  useEffect(() => {
    if (!focusId || !ready) return;
    const c = conferences.find((x) => x.id === focusId);
    if (!c) return;
    globeRef.current?.pointOfView({ lat: c.lat, lng: c.lng, altitude: 1.5 }, 900);
  }, [focusId, ready, conferences]);

  return (
    <div
      ref={wrapRef}
      className="h-full w-full"
      onPointerEnter={() => setAutoRotate(false)}
      onPointerLeave={() => setAutoRotate(true)}
      style={{ opacity: ready ? 1 : 0, transition: 'opacity 900ms ease' }}
    >
      {size.width > 0 && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          onGlobeReady={onReady}
          globeImageUrl="/globe/earth-night.jpg"
          bumpImageUrl="/globe/earth-topology.png"
          backgroundColor="rgba(0,0,0,0)"
          showAtmosphere
          atmosphereColor="#5ecbb8"
          atmosphereAltitude={0.16}
          animateIn={false}
          rendererConfig={{ antialias: true, alpha: true }}
          // Points
          pointsData={points}
          pointLat={(d) => (d as GlobePoint).lat}
          pointLng={(d) => (d as GlobePoint).lng}
          pointColor={(d) => (d as GlobePoint).color}
          pointAltitude={(d) => (d as GlobePoint).altitude}
          pointRadius={(d) => (d as GlobePoint).radius}
          pointLabel={(d) => (d as GlobePoint).label}
          pointResolution={10}
          pointsMerge={false}
          pointsTransitionDuration={600}
          onPointClick={(d: object) => {
            const p = d as GlobePoint;
            if (p.kind === 'home') return;
            globeRef.current?.pointOfView({ lat: p.lat, lng: p.lng, altitude: 1.5 }, 800);
            onSelect(p.id);
          }}
          // Arcs from home base to planned events
          arcsData={arcs}
          arcStartLat={(d) => (d as GlobeArc).startLat}
          arcStartLng={(d) => (d as GlobeArc).startLng}
          arcEndLat={(d) => (d as GlobeArc).endLat}
          arcEndLng={(d) => (d as GlobeArc).endLng}
          arcColor={(d: object) => (d as GlobeArc).color}
          arcStroke={0.5}
          arcDashLength={0.35}
          arcDashGap={0.18}
          arcDashAnimateTime={2400}
          arcAltitudeAutoScale={0.25}
          // Pulsing rings on cluster centroids
          ringsData={rings}
          ringLat={(d) => (d as GlobeRing).lat}
          ringLng={(d) => (d as GlobeRing).lng}
          ringColor={() => (t: number) => `rgba(133,147,245,${Math.max(0, 0.9 - t)})`}
          ringMaxRadius={4.5}
          ringPropagationSpeed={1.6}
          ringRepeatPeriod={1300}
          // Labels for planned events and home
          labelsData={labels}
          labelLat={(d) => (d as GlobeLabel).lat}
          labelLng={(d) => (d as GlobeLabel).lng}
          labelText={(d) => (d as GlobeLabel).text}
          labelSize={(d) => (d as GlobeLabel).size}
          labelColor={(d) => (d as GlobeLabel).color}
          labelDotRadius={0}
          labelAltitude={0.02}
          labelResolution={2}
        />
      )}
    </div>
  );
}
