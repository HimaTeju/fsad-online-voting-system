import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import INDIA_DATA from '../../data/india-states.json';
import KARNATAKA_DATA from '../../data/karnataka-districts.json';
import BANGALORE_DATA from '../../data/bangalore-taluks.json';
import { TOPOJSON_NAME_MAP, SEATS_BY_STATE, seatColor } from '../../data/indiaSeats';

interface Feature {
  type: string;
  properties: Record<string, string>;
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][][] };
}

interface TooltipState { x: number; y: number; label: string }

// Constituency colours for Bangalore taluks
const TALUK_COLORS: Record<string, string> = {
  'Bengaluru North':   '#1d5c8a',
  'Bengaluru South':   '#1a3a6c',
  'Bengaluru East':    '#2d7aaa',
};

// Constituency district → GeoJSON district name mapping
const WOMEN_DISTRICT_MAP: Record<string, string> = {
  'Kalaburagi': 'Gulbarga',
  'Raichur':    'Raichur',
  'Davanagere': 'Davanagere',
  'Hassan':     'Hassan',
  'Mysuru':     'Mysore',
};

function makeProjector(scale: number, tx: number, ty: number) {
  return (lon: number, lat: number): [number, number] => {
    const x = scale * (lon * Math.PI / 180) + tx;
    const y = -scale * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) + ty;
    return [x, y];
  };
}

function ringToPath(ring: number[][], project: (lon: number, lat: number) => [number, number]): string {
  return ring.map((pt, i) => {
    const [x, y] = project(pt[0], pt[1]);
    return (i === 0 ? 'M' : 'L') + x.toFixed(2) + ',' + y.toFixed(2);
  }).join('') + 'Z';
}

function featureToPath(feature: Feature, project: (lon: number, lat: number) => [number, number]): string {
  const g = feature.geometry;
  if (g.type === 'Polygon') return (g.coordinates as number[][][]).map(r => ringToPath(r, project)).join('');
  return (g.coordinates as number[][][][]).flatMap(poly => poly.map(r => ringToPath(r, project))).join('');
}

const indiaProject = makeProjector(1277, -1504, 901);
const karnProject  = makeProjector(5770, -7348, 1914);
// Fits all 3 Bengaluru taluks into the 680×760 viewport with ~48px margin
const bangProject  = makeProjector(72721, -98101, 16952);

const W = 680, H = 760;
const KCX = 197.5, KCY = 561.5, KZOOM = 4.1972;
const MAX_R = Math.sqrt(Math.max(
  KCX ** 2 + KCY ** 2,
  (W - KCX) ** 2 + KCY ** 2,
  KCX ** 2 + (H - KCY) ** 2,
  (W - KCX) ** 2 + (H - KCY) ** 2,
)) + 10;

// Bangalore centroid in Karnataka SVG space (all 3 taluks combined)
const BCX = 464.9, BCY = 593.2, BZOOM = 12.0;
const BANG_MAX_R = Math.sqrt(Math.max(
  BCX ** 2 + BCY ** 2,
  (W - BCX) ** 2 + BCY ** 2,
  BCX ** 2 + (H - BCY) ** 2,
  (W - BCX) ** 2 + (H - BCY) ** 2,
)) + 10;

export default function IndiaMap({ womenDistricts = [] }: { womenDistricts?: string[] }) {
  // phase drives what's visible/interactive — React owns this
  const [phase, setPhase]     = useState<'india' | 'animating' | 'karnataka' | 'bangalore'>('india');
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  // Refs for elements that get imperatively animated (never touched by React style reconciler)
  const statesLayerRef    = useRef<SVGGElement>(null);
  const districtsLayerRef = useRef<SVGGElement>(null);
  const districtsBgRef    = useRef<SVGGElement>(null);
  const spotCircleRef     = useRef<SVGCircleElement>(null);
  const maskCircleRef     = useRef<SVGCircleElement>(null);
  const dimOverlayRef     = useRef<SVGRectElement>(null);
  const ringGlowRef       = useRef<SVGCircleElement>(null);

  // Bangalore drill-down refs (second spotlight layer)
  const bangSpotRef       = useRef<SVGCircleElement>(null);
  const bangMaskRef       = useRef<SVGCircleElement>(null);
  const bangDimRef        = useRef<SVGRectElement>(null);
  const bangRingRef       = useRef<SVGCircleElement>(null);
  const bangBgRef         = useRef<SVGGElement>(null);
  const bangLayerRef      = useRef<SVGGElement>(null);

  const distLensRef  = useRef<{ el: SVGPathElement; len: number }[]>([]);
  const talukLensRef = useRef<{ el: SVGPathElement; len: number }[]>([]);
  const rafRef       = useRef<number>(0);

  const indiaFeatures = useMemo(() => (INDIA_DATA as { features: Feature[] }).features, []);
  const karnFeatures  = useMemo(() => (KARNATAKA_DATA as { features: Feature[] }).features, []);
  const bangFeatures  = useMemo(() => (BANGALORE_DATA as { features: Feature[] }).features, []);

  const womenGeoSet = useMemo(() => {
    const s = new Set<string>();
    womenDistricts.forEach(d => s.add(WOMEN_DISTRICT_MAP[d] ?? d));
    return s;
  }, [womenDistricts]);

  // Collect district path stroke lengths on first mount
  const setDistrictRef = useCallback((el: SVGPathElement | null, idx: number) => {
    if (!el) return;
    const len = el.getTotalLength();
    el.setAttribute('stroke-dasharray', String(len));
    el.setAttribute('stroke-dashoffset', String(len));
    distLensRef.current[idx] = { el, len };
  }, []);

  // Collect taluk path stroke lengths for Bangalore draw-in animation
  const setTalukRef = useCallback((el: SVGPathElement | null, idx: number) => {
    if (!el) return;
    const len = el.getTotalLength();
    el.setAttribute('stroke-dasharray', String(len));
    el.setAttribute('stroke-dashoffset', String(len));
    talukLensRef.current[idx] = { el, len };
  }, []);

  // ── Native pointer events on SVG layers (bypasses React delegation issues) ──
  useEffect(() => {
    const sl = statesLayerRef.current;
    const dl = districtsLayerRef.current;
    if (!sl || !dl) return;

    function handleStateOver(e: MouseEvent) {
      const path = (e.target as SVGElement).closest('path');
      if (!path) return;
      const name = path.dataset.name ?? '';
      const label = path.dataset.label ?? '';
      setHovered(name);
      setTooltip({ x: e.clientX, y: e.clientY, label });
    }
    function handleStateMove(e: MouseEvent) {
      setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
    }
    function handleStateOut(e: MouseEvent) {
      const path = (e.target as SVGElement).closest('path');
      if (!path) return;
      setHovered(null);
      setTooltip(null);
    }
    function handleDistrictOver(e: MouseEvent) {
      const path = (e.target as SVGElement).closest('path');
      if (!path) return;
      const name = path.dataset.name ?? '';
      const isBang = path.dataset.bangalore === 'true';
      setHovered(name);
      setTooltip({ x: e.clientX, y: e.clientY, label: isBang ? name + ' — click to explore' : name });
    }
    function handleDistrictMove(e: MouseEvent) {
      setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
    }
    function handleDistrictOut(e: MouseEvent) {
      const path = (e.target as SVGElement).closest('path');
      if (!path) return;
      setHovered(null);
      setTooltip(null);
    }

    sl.addEventListener('mouseover', handleStateOver);
    sl.addEventListener('mousemove', handleStateMove);
    sl.addEventListener('mouseout', handleStateOut);
    dl.addEventListener('mouseover', handleDistrictOver);
    dl.addEventListener('mousemove', handleDistrictMove);
    dl.addEventListener('mouseout', handleDistrictOut);

    return () => {
      sl.removeEventListener('mouseover', handleStateOver);
      sl.removeEventListener('mousemove', handleStateMove);
      sl.removeEventListener('mouseout', handleStateOut);
      dl.removeEventListener('mouseover', handleDistrictOver);
      dl.removeEventListener('mousemove', handleDistrictMove);
      dl.removeEventListener('mouseout', handleDistrictOut);
    };
  }, []);

  const zoomIn = useCallback(() => {
    setPhase('animating');
    setHovered(null);
    setTooltip(null);

    const sl   = statesLayerRef.current!;
    const sc   = spotCircleRef.current!;
    const mc   = maskCircleRef.current!;
    const dim  = dimOverlayRef.current!;
    const bg   = districtsBgRef.current!;
    const ring = ringGlowRef.current!;

    // Flash Karnataka
    sl.querySelectorAll<SVGPathElement>('[data-name="KARNATAKA"]').forEach(p => {
      p.setAttribute('fill', '#e8622a'); p.setAttribute('stroke', '#fbbf71');
    });

    // Ring pulse
    ring.setAttribute('r', '30'); ring.setAttribute('opacity', '0.9');
    setTimeout(() => ring.setAttribute('opacity', '0'), 300);

    // Dim India outside spotlight
    dim.setAttribute('opacity', '0');
    dim.style.transition = 'opacity 0.4s';
    requestAnimationFrame(() => dim.setAttribute('opacity', '0.9'));

    setTimeout(() => {
      // Zoom India out
      sl.style.transition = 'transform 0.75s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease 0.5s';
      sl.style.transformOrigin = `${KCX}px ${KCY}px`;
      sl.style.transform = `scale(${KZOOM})`;
      sl.style.opacity = '0';

      // Grow spotlight
      bg.removeAttribute('hidden');
      sc.setAttribute('r', '0'); mc.setAttribute('r', '0');

      const dur = 750, t0 = performance.now();
      function grow(t: number) {
        const p = Math.min((t - t0) / dur, 1);
        const r = (1 - Math.pow(1 - p, 3)) * MAX_R;
        sc.setAttribute('r', r.toFixed(1));
        mc.setAttribute('r', r.toFixed(1));
        if (p < 1) rafRef.current = requestAnimationFrame(grow);
        else afterDrillIn();
      }
      rafRef.current = requestAnimationFrame(grow);
    }, 120);
  }, []);

  function afterDrillIn() {
    const sl  = statesLayerRef.current!;
    const dl  = districtsLayerRef.current!;
    const dim = dimOverlayRef.current!;
    const bg  = districtsBgRef.current!;

    sl.setAttribute('hidden', '');
    dim.setAttribute('opacity', '0');
    bg.setAttribute('hidden', '');
    dl.removeAttribute('clip-path');

    setPhase('karnataka');

    distLensRef.current.forEach((p, i) => {
      setTimeout(() => {
        p.el.style.transition = 'stroke-dashoffset 0.55s cubic-bezier(0.25,0.46,0.45,0.94)';
        p.el.style.strokeDashoffset = '0';
      }, i * 20);
    });
  }

  const zoomBack = useCallback(() => {
    setPhase('animating');
    setHovered(null);
    setTooltip(null);

    const sl  = statesLayerRef.current!;
    const dl  = districtsLayerRef.current!;
    const sc  = spotCircleRef.current!;
    const mc  = maskCircleRef.current!;
    const bg  = districtsBgRef.current!;

    // Reset districts
    distLensRef.current.forEach(p => {
      p.el.style.transition = 'none';
      p.el.style.strokeDashoffset = String(p.len);
    });
    dl.setAttribute('clip-path', 'url(#spotlight)');

    // Restore states layer behind, invisible + zoomed-out
    sl.removeAttribute('hidden');
    sl.style.transition = 'none';
    sl.style.opacity = '0';
    sl.style.transform = `scale(${KZOOM})`;

    bg.removeAttribute('hidden');
    const r0 = parseFloat(sc.getAttribute('r') ?? '0');
    const dur = 600, t0 = performance.now();

    function shrink(t: number) {
      const p = Math.min((t - t0) / dur, 1);
      const r = (1 - p * p) * r0;
      sc.setAttribute('r', r.toFixed(1));
      mc.setAttribute('r', r.toFixed(1));
      if (p < 1) rafRef.current = requestAnimationFrame(shrink);
      else { sc.setAttribute('r', '0'); mc.setAttribute('r', '0'); bg.setAttribute('hidden', ''); }
    }
    rafRef.current = requestAnimationFrame(shrink);

    // Zoom India back in
    setTimeout(() => {
      sl.style.transition = 'transform 0.65s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease';
      sl.style.transform = 'scale(1)';
      sl.style.opacity = '1';
    }, 30);

    // Restore Karnataka fill then flip phase
    setTimeout(() => {
      sl.querySelectorAll<SVGPathElement>('[data-name="KARNATAKA"]').forEach(p => {
        p.setAttribute('fill', seatColor(28, false, true));
        p.setAttribute('stroke', '#7eb8d4');
      });
      setPhase('india');
    }, 700);
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const zoomToBangalore = useCallback(() => {
    setPhase('animating');
    setHovered(null);
    setTooltip(null);

    const dl   = districtsLayerRef.current!;
    const sc   = bangSpotRef.current!;
    const mc   = bangMaskRef.current!;
    const dim  = bangDimRef.current!;
    const bg   = bangBgRef.current!;
    const ring = bangRingRef.current!;

    // Flash Bangalore district
    dl.querySelectorAll<SVGPathElement>('[data-name="Bangalore"]').forEach(p => {
      p.setAttribute('fill', '#f97316'); p.setAttribute('stroke', '#fbbf71');
    });

    // Ring pulse at Bangalore centroid
    ring.setAttribute('r', '20'); ring.setAttribute('opacity', '0.9');
    setTimeout(() => ring.setAttribute('opacity', '0'), 300);

    // Dim Karnataka outside spotlight
    dim.setAttribute('opacity', '0');
    dim.style.transition = 'opacity 0.4s';
    requestAnimationFrame(() => dim.setAttribute('opacity', '0.9'));

    setTimeout(() => {
      // Zoom Karnataka districts out
      dl.style.transition = 'transform 0.75s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease 0.5s';
      dl.style.transformOrigin = `${BCX}px ${BCY}px`;
      dl.style.transform = `scale(${BZOOM})`;
      dl.style.opacity = '0';

      bg.removeAttribute('hidden');
      sc.setAttribute('r', '0'); mc.setAttribute('r', '0');

      const dur = 750, t0 = performance.now();
      function grow(t: number) {
        const p = Math.min((t - t0) / dur, 1);
        const r = (1 - Math.pow(1 - p, 3)) * BANG_MAX_R;
        sc.setAttribute('r', r.toFixed(1));
        mc.setAttribute('r', r.toFixed(1));
        if (p < 1) rafRef.current = requestAnimationFrame(grow);
        else afterBangaloreDrillIn();
      }
      rafRef.current = requestAnimationFrame(grow);
    }, 120);
  }, []);

  function afterBangaloreDrillIn() {
    const dl  = districtsLayerRef.current!;
    const dim = bangDimRef.current!;
    const bg  = bangBgRef.current!;
    const bl  = bangLayerRef.current!;

    dl.setAttribute('hidden', '');
    dim.setAttribute('opacity', '0');
    bg.setAttribute('hidden', '');
    bl.removeAttribute('hidden');

    setPhase('bangalore');

    talukLensRef.current.forEach((p, i) => {
      setTimeout(() => {
        p.el.style.transition = 'stroke-dashoffset 0.6s cubic-bezier(0.25,0.46,0.45,0.94)';
        p.el.style.strokeDashoffset = '0';
      }, i * 150);
    });
  }

  const zoomBackToKarnataka = useCallback(() => {
    setPhase('animating');
    setHovered(null);
    setTooltip(null);

    const dl  = districtsLayerRef.current!;
    const sc  = bangSpotRef.current!;
    const mc  = bangMaskRef.current!;
    const bg  = bangBgRef.current!;
    const bl  = bangLayerRef.current!;

    // Reset taluk stroke animations
    talukLensRef.current.forEach(p => {
      p.el.style.transition = 'none';
      p.el.style.strokeDashoffset = String(p.len);
    });
    bl.setAttribute('hidden', '');

    // Restore districts layer behind, invisible + zoomed-out
    dl.removeAttribute('hidden');
    dl.style.transition = 'none';
    dl.style.opacity = '0';
    dl.style.transform = `scale(${BZOOM})`;
    dl.style.transformOrigin = `${BCX}px ${BCY}px`;

    bg.removeAttribute('hidden');
    const r0 = parseFloat(sc.getAttribute('r') ?? '0');
    const dur = 600, t0 = performance.now();

    function shrink(t: number) {
      const p = Math.min((t - t0) / dur, 1);
      const r = (1 - p * p) * r0;
      sc.setAttribute('r', r.toFixed(1));
      mc.setAttribute('r', r.toFixed(1));
      if (p < 1) rafRef.current = requestAnimationFrame(shrink);
      else { sc.setAttribute('r', '0'); mc.setAttribute('r', '0'); bg.setAttribute('hidden', ''); }
    }
    rafRef.current = requestAnimationFrame(shrink);

    // Zoom Karnataka districts back in
    setTimeout(() => {
      dl.style.transition = 'transform 0.65s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease';
      dl.style.transform = 'scale(1)';
      dl.style.opacity = '1';
    }, 30);

    // Restore Bangalore fill then flip phase
    setTimeout(() => {
      dl.querySelectorAll<SVGPathElement>('[data-name="Bangalore"]').forEach(p => {
        p.setAttribute('fill', '#e8622a');
        p.setAttribute('stroke', '#fbbf71');
      });
      setPhase('karnataka');
    }, 700);
  }, []);

  const isIndia      = phase === 'india';
  const isKarnataka  = phase === 'karnataka';
  const isBangalore  = phase === 'bangalore';

  return (
    <div style={{ position: 'relative', fontFamily: '"Segoe UI", system-ui, sans-serif', color: '#e2e8f0' }}>

      {/* Breadcrumb nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', fontSize: '0.78rem', color: '#475569' }}>
        <span
          style={{ cursor: isIndia ? 'default' : 'pointer', color: isIndia ? '#64748b' : '#94a3b8', transition: 'color 0.15s' }}
          onClick={() => { if (isKarnataka) zoomBack(); if (isBangalore) { zoomBackToKarnataka(); setTimeout(zoomBack, 800); } }}
          onMouseEnter={e => { if (!isIndia) e.currentTarget.style.color = '#f97316'; }}
          onMouseLeave={e => { if (!isIndia) e.currentTarget.style.color = '#94a3b8'; }}
        >India</span>
        {!isIndia && <><span style={{ color: '#334155' }}>›</span>
          <span
            style={{ cursor: isBangalore ? 'pointer' : 'default', color: isBangalore ? '#94a3b8' : '#64748b', transition: 'color 0.15s' }}
            onClick={() => { if (isBangalore) zoomBackToKarnataka(); }}
            onMouseEnter={e => { if (isBangalore) e.currentTarget.style.color = '#f97316'; }}
            onMouseLeave={e => { if (isBangalore) e.currentTarget.style.color = '#94a3b8'; }}
          >Karnataka</span></>}
        {isBangalore && <><span style={{ color: '#334155' }}>›</span>
          <span style={{ color: '#f97316', fontWeight: 600 }}>Bangalore</span></>}
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>
          {isBangalore ? 'Bangalore — Constituencies' : isKarnataka ? 'Karnataka — Districts' : 'India — States & Union Territories'}
        </div>
        {isKarnataka && (
          <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: '0.2rem' }}>
            30 districts · Census 2011 boundaries
          </div>
        )}
        {isBangalore && (
          <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: '0.2rem' }}>
            Lok Sabha constituencies · 3 seats
          </div>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 6 }}>
        <defs>
          <clipPath id="spotlight">
            <circle ref={spotCircleRef} cx={KCX} cy={KCY} r={0} />
          </clipPath>
          <mask id="outside-mask">
            <rect width={W} height={H} fill="white" />
            <circle ref={maskCircleRef} cx={KCX} cy={KCY} r={0} fill="black" />
          </mask>
          {/* Bangalore spotlight */}
          <clipPath id="bang-spotlight">
            <circle ref={bangSpotRef} cx={BCX} cy={BCY} r={0} />
          </clipPath>
          <mask id="bang-outside-mask">
            <rect width={W} height={H} fill="white" />
            <circle ref={bangMaskRef} cx={BCX} cy={BCY} r={0} fill="black" />
          </mask>
        </defs>

        <rect width={W} height={H} fill="#0d2137" />

        {/* States layer — React renders paths, native listeners handle hover */}
        <g ref={statesLayerRef} style={{ pointerEvents: isIndia ? 'auto' : 'none' }}>
          {indiaFeatures.map(feature => {
            const rawName = feature.properties.STNAME_SH ?? feature.properties.STNAME ?? '';
            const name    = feature.properties.STNAME ?? '';
            const mapped  = TOPOJSON_NAME_MAP[rawName] ?? rawName;
            const seats   = SEATS_BY_STATE[mapped] ?? 0;
            const isKarn  = name === 'KARNATAKA';
            const isHov   = hovered === name;
            const label   = rawName || name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
            const fill    = isHov
              ? (isKarn ? '#e8622a' : seatColor(seats, true, false))
              : seatColor(seats, false, isKarn);
            const stroke  = isHov ? (isKarn ? '#fbbf71' : '#fed7aa') : '#7eb8d4';
            return (
              <path
                key={name}
                data-name={name}
                data-label={isKarn ? label + ' — click to explore' : `${label} (${seats} seats)`}
                d={featureToPath(feature, indiaProject)}
                fill={fill}
                stroke={stroke}
                strokeWidth={isHov ? 0.9 : 0.8}
                style={{ cursor: isKarn ? 'pointer' : 'default', transition: 'fill 0.15s' }}
                onClick={() => { if (isKarn && isIndia) zoomIn(); }}
              />
            );
          })}
        </g>

        {/* Dim overlay */}
        <rect
          ref={dimOverlayRef}
          width={W} height={H} fill="#0d2137" opacity={0}
          mask="url(#outside-mask)"
          style={{ pointerEvents: 'none' }}
        />

        {/* Karnataka bg (animation only) */}
        <g ref={districtsBgRef} hidden style={{ pointerEvents: 'none' }}>
          <rect width={W} height={H} fill="#0d2137" clipPath="url(#spotlight)" />
        </g>

        {/* Districts layer */}
        <g ref={districtsLayerRef} clipPath="url(#spotlight)" style={{ pointerEvents: isKarnataka ? 'auto' : 'none' }}>
          {karnFeatures.map((feature, idx) => {
            const name    = feature.properties.DISTRICT ?? '';
            const isBang  = name === 'Bangalore';
            const isHov   = hovered === name;
            const isWomen = womenGeoSet.has(name);
            const baseFill   = isBang ? '#e8622a' : isWomen ? '#c0486a' : '#1a3a6c';
            const hovFill    = isBang ? '#f97316' : isWomen ? '#e05580' : '#2d7aaa';
            return (
              <path
                key={name}
                data-name={name}
                data-bangalore={isBang ? 'true' : undefined}
                data-label={isBang ? name + ' — click to explore' : `${name}${isWomen ? ' — Women Reserved' : ''}`}
                ref={el => setDistrictRef(el, idx)}
                d={featureToPath(feature, karnProject)}
                fill={isHov ? hovFill : baseFill}
                stroke={isHov ? '#fbbf71' : isBang ? '#fbbf71' : isWomen ? '#f0a0bb' : '#7eb8d4'}
                strokeWidth={isBang ? 1.2 : isHov ? 0.9 : 0.6}
                style={{ cursor: isBang ? 'pointer' : 'default', transition: 'fill 0.15s' }}
                onClick={() => { if (isBang && isKarnataka) zoomToBangalore(); }}
              />
            );
          })}
        </g>

        {/* Bangalore dim overlay */}
        <rect
          ref={bangDimRef}
          width={W} height={H} fill="#0d2137" opacity={0}
          mask="url(#bang-outside-mask)"
          style={{ pointerEvents: 'none' }}
        />

        {/* Bangalore bg (animation only) */}
        <g ref={bangBgRef} hidden style={{ pointerEvents: 'none' }}>
          <rect width={W} height={H} fill="#0d2137" clipPath="url(#bang-spotlight)" />
        </g>

        {/* Bangalore constituency info layer */}
        <g ref={bangLayerRef} hidden clipPath="url(#bang-spotlight)" style={{ pointerEvents: 'none' }}>
          <rect width={W} height={H} fill="#0a1929" />
          {/* Taluk polygons drawn with the bangProject */}
          {bangFeatures.map((feature, idx) => {
            const name  = feature.properties.TALUK ?? '';
            const cons  = feature.properties.CONSTITUENCY ?? name;
            const color = TALUK_COLORS[name] ?? '#1a3a6c';
            return (
              <path
                key={name}
                ref={el => setTalukRef(el, idx)}
                d={featureToPath(feature, bangProject)}
                fill={color}
                stroke="#7eb8d4"
                strokeWidth={0.8}
                data-name={name}
                data-label={`${cons} · Lok Sabha`}
              />
            );
          })}
          {/* Taluk name labels at geometric centroids */}
          {bangFeatures.map(feature => {
            const name  = feature.properties.TALUK ?? '';
            const cons  = feature.properties.CONSTITUENCY ?? name;
            const CENTROIDS: Record<string, [number, number]> = {
              'Bengaluru North': [294.2, 262.7],
              'Bengaluru South': [331.7, 431.5],
              'Bengaluru East':  [541.0, 232.7],
            };
            const [cx, cy] = CENTROIDS[name] ?? [340, 380];
            return (
              <g key={name + '-label'}>
                <text x={cx} y={cy - 8} textAnchor="middle" fill="#f1f5f9" fontSize={11} fontWeight={700}>{cons}</text>
                <text x={cx} y={cy + 8} textAnchor="middle" fill="#94a3b8" fontSize={9}>Lok Sabha · General</text>
                <text x={cx} y={cy + 22} textAnchor="middle" fill="#64748b" fontSize={9}>{feature.properties.VOTERS} voters</text>
              </g>
            );
          })}
          {/* City header */}
          <text x={W / 2} y={40} textAnchor="middle" fill="#f97316" fontSize={18} fontWeight={800} letterSpacing={1}>Bengaluru</text>
          <text x={W / 2} y={58} textAnchor="middle" fill="#475569" fontSize={10}>Silicon Valley of India · Karnataka Capital</text>
        </g>

        <circle
          ref={ringGlowRef}
          cx={KCX} cy={KCY} r={0}
          fill="none" stroke="#f97316" strokeWidth={2} opacity={0}
          style={{ pointerEvents: 'none' }}
        />
        <circle
          ref={bangRingRef}
          cx={BCX} cy={BCY} r={0}
          fill="none" stroke="#f97316" strokeWidth={2} opacity={0}
          style={{ pointerEvents: 'none' }}
        />
      </svg>

      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.75rem', color: '#94a3b8', alignItems: 'center', flexWrap: 'wrap' }}>
        {isBangalore ? (
          <>
            {Object.entries(TALUK_COLORS).map(([taluk, color]) => (
              <div key={taluk} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'inline-block', width: 18, height: 12, borderRadius: 2, background: color, border: '1px solid #334155' }} />
                <span>{taluk}</span>
              </div>
            ))}
          </>
        ) : isKarnataka ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', width: 18, height: 12, borderRadius: 2, background: '#e8622a', border: '1px solid #fbbf71' }} />
              <span>Bangalore — click to explore</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', width: 18, height: 12, borderRadius: 2, background: '#1a3a6c', border: '1px solid #334155' }} />
              <span>General district</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', width: 18, height: 12, borderRadius: 2, background: '#c0486a', border: '1px solid #f0a0bb' }} />
              <span>Women Reserved (demo)</span>
            </div>
          </>
        ) : (
          <>
            <span style={{ color: '#475569', fontWeight: 600, fontSize: '0.7rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Lok Sabha seats</span>
            {[
              { color: '#1a3a5c', label: '40+' },
              { color: '#1d5c8a', label: '20–39' },
              { color: '#2d7aaa', label: '10–19' },
              { color: '#5a9ec4', label: '5–9' },
              { color: '#96c4dc', label: '1–4' },
              { color: '#E8622A', label: 'Karnataka' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ display: 'inline-block', width: 18, height: 12, borderRadius: 2, background: color, border: '1px solid #334155' }} />
                <span>{label}</span>
              </div>
            ))}
          </>
        )}
      </div>

      {isIndia && (
        <div style={{ fontSize: '0.68rem', color: '#334155', marginTop: '0.5rem', letterSpacing: '0.03em' }}>
          Click on Karnataka to explore its districts
        </div>
      )}
      {isKarnataka && (
        <div style={{ fontSize: '0.68rem', color: '#334155', marginTop: '0.5rem', letterSpacing: '0.03em' }}>
          Click on Bangalore to explore its constituencies
        </div>
      )}

      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x + 16, top: tooltip.y - 12,
          background: '#1e293b', border: '1px solid #f97316',
          borderRadius: 6, padding: '6px 14px',
          fontSize: '0.88rem', fontWeight: 600, color: '#f8fafc',
          pointerEvents: 'none', whiteSpace: 'nowrap',
          boxShadow: '0 4px 20px rgba(0,0,0,0.6)', zIndex: 1000,
        }}>
          {tooltip.label}
        </div>
      )}
    </div>
  );
}
