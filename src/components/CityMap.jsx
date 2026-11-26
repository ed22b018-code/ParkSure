import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { coastLng } from '../data/places.js';

/*
  Illustrated Mumbai map, drawn entirely in SVG so it always loads (no tile servers).
  Real-ish geography: west coastline, Western Railway, major arterials and area names.
  Everything is anchored to world coordinates so panning and zooming feel like a real map.
*/

const LAT0 = 19.0;
const LNG0 = 72.8;
const MY = 111320; // metres per degree latitude
const MX = 111320 * Math.cos((19.05 * Math.PI) / 180); // metres per degree longitude around Mumbai

const toM = (p) => ({ x: (p.lng - LNG0) * MX, y: (p.lat - LAT0) * MY });
const fromM = (m) => ({ lat: LAT0 + m.y / MY, lng: LNG0 + m.x / MX });

const ROADS = [
  { name: 'Western Express Hwy', kind: 'hwy', pts: [[19.035, 72.851], [19.06, 72.853], [19.1, 72.855], [19.13, 72.857], [19.17, 72.862]] },
  { name: 'S.V. Road', kind: 'major', pts: [[19.045, 72.838], [19.07, 72.837], [19.1, 72.842], [19.13, 72.845], [19.17, 72.847]] },
  { name: 'Linking Road', kind: 'major', pts: [[19.058, 72.832], [19.08, 72.834], [19.11, 72.836], [19.14, 72.833], [19.165, 72.836]] },
  { name: 'Juhu Tara Road', kind: 'major', pts: [[19.072, 72.826], [19.09, 72.8275], [19.108, 72.8285]] },
  { name: 'Hill Road', kind: 'major', pts: [[19.0545, 72.8395], [19.053, 72.832], [19.05, 72.824]] },
  { name: 'Senapati Bapat Marg', kind: 'major', pts: [[18.985, 72.826], [19.0, 72.83], [19.02, 72.842], [19.035, 72.845]] },
  { name: 'Gokhale Road', kind: 'major', pts: [[19.012, 72.836], [19.022, 72.837], [19.032, 72.836]] },
  { name: 'Veer Savarkar Marg', kind: 'major', pts: [[19.008, 72.826], [19.02, 72.833], [19.035, 72.8375]] },
  { name: 'Andheri–Kurla Road', kind: 'major', pts: [[19.119, 72.848], [19.115, 72.86], [19.108, 72.875]] },
  { name: 'J.P. Road', kind: 'major', pts: [[19.12, 72.845], [19.128, 72.835], [19.135, 72.826]] },
  { name: 'BKC Road', kind: 'major', pts: [[19.052, 72.853], [19.06, 72.862], [19.066, 72.872]] },
  { name: 'Jogeshwari–Vikhroli Link Rd', kind: 'major', pts: [[19.14, 72.85], [19.142, 72.865], [19.14, 72.88]] },
  { name: 'Sea Link', kind: 'bridge', pts: [[19.044, 72.817], [19.03, 72.812], [19.015, 72.811]] },
];
const RAIL = [[18.988, 72.8255], [19.0, 72.832], [19.019, 72.843], [19.035, 72.843], [19.054, 72.8405], [19.07, 72.8405], [19.09, 72.843], [19.119, 72.8465], [19.14, 72.848], [19.165, 72.849]];
const AREAS = [
  ['Lower Parel', 18.997, 72.832], ['Worli', 19.008, 72.818], ['Prabhadevi', 19.016, 72.8285], ['Dadar', 19.022, 72.846],
  ['Mahim', 19.039, 72.842], ['Bandra West', 19.059, 72.83], ['BKC', 19.064, 72.866], ['Khar', 19.072, 72.836],
  ['Santacruz', 19.083, 72.843], ['Juhu', 19.103, 72.83], ['Vile Parle', 19.1, 72.846], ['Andheri West', 19.13, 72.836],
  ['Andheri East', 19.115, 72.866], ['Goregaon', 19.158, 72.852], ['Versova', 19.135, 72.818], ['Kalina', 19.075, 72.862],
];

function hash(a, b) {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const CELL = 140;

function MapArt({ w, h, cm, scale }) {
  const toS = (m) => ({ x: w / 2 + (m.x - cm.x) / scale, y: h / 2 - (m.y - cm.y) / scale });
  const geo = (lat, lng) => toS(toM({ lat, lng }));
  const minX = cm.x - (w / 2) * scale - CELL;
  const maxX = cm.x + (w / 2) * scale + CELL;
  const minY = cm.y - (h / 2) * scale - CELL;
  const maxY = cm.y + (h / 2) * scale + CELL;

  // sea polygon from the left edge to the coastline
  const sea = [];
  const steps = 40;
  for (let k = 0; k <= steps; k++) {
    const yM = maxY - ((maxY - minY) * k) / steps;
    const lat = LAT0 + yM / MY;
    const p = geo(lat, coastLng(lat));
    sea.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  }
  const seaPath = `M-50,${toS({ x: 0, y: maxY }).y} L${sea.join(' L')} L-50,${toS({ x: 0, y: minY }).y} Z`;
  const beach = `M${sea.join(' L')}`;

  const blocks = [];
  const streets = [];
  const detailed = scale <= 7;
  if (detailed) {
    const i0 = Math.floor(minX / CELL); const i1 = Math.ceil(maxX / CELL);
    const j0 = Math.floor(minY / CELL); const j1 = Math.ceil(maxY / CELL);
    const lineX = (i) => i * CELL + (hash(i, 7) - 0.5) * 36;
    const lineY = (j) => j * CELL + (hash(3, j) - 0.5) * 36;
    for (let i = i0; i < i1; i++) {
      for (let j = j0; j < j1; j++) {
        const x0 = lineX(i); const x1 = lineX(i + 1); const y0 = lineY(j); const y1 = lineY(j + 1);
        const midLat = LAT0 + ((y0 + y1) / 2) / MY;
        const coastX = (coastLng(midLat) - LNG0) * MX;
        if (x1 < coastX + 20) continue;
        const r = hash(i, j);
        const inset = 11;
        const a = toS({ x: Math.max(x0, coastX + 30) + inset, y: y1 - inset });
        const b = toS({ x: x1 - inset, y: y0 + inset });
        const park = r < 0.05;
        if (b.x - a.x > 2 && b.y - a.y > 2) {
          blocks.push(<rect key={`b${i}_${j}`} x={a.x} y={a.y} width={b.x - a.x} height={b.y - a.y} rx={Math.min(6, 18 / scale)} className={park ? 'cm-park' : r > 0.7 ? 'cm-block2' : 'cm-block'} />);
          if (!park && r > 0.35 && scale < 3.2) {
            // a building footprint inside the block
            const pad = (b.x - a.x) * (0.18 + hash(j, i) * 0.12);
            blocks.push(<rect key={`h${i}_${j}`} x={a.x + pad} y={a.y + pad * 0.8} width={Math.max(2, b.x - a.x - pad * 2)} height={Math.max(2, b.y - a.y - pad * 1.6)} rx="2" className="cm-bldg" />);
          }
        }
        // street segments (some missing, like real lanes)
        if (hash(i * 3, j) > 0.12 && x0 > coastX) {
          const p = toS({ x: x0, y: y0 }); const q = toS({ x: x0, y: y1 });
          streets.push(`M${p.x.toFixed(1)},${p.y.toFixed(1)}L${q.x.toFixed(1)},${q.y.toFixed(1)}`);
        }
        if (hash(i, j * 5) > 0.1) {
          const p = toS({ x: Math.max(x0, coastX), y: y0 }); const q = toS({ x: x1, y: y0 });
          if (q.x > p.x) streets.push(`M${p.x.toFixed(1)},${p.y.toFixed(1)}L${q.x.toFixed(1)},${q.y.toFixed(1)}`);
        }
      }
    }
  }
  const line = (pts) => 'M' + pts.map(([la, ln]) => { const p = geo(la, ln); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join('L');
  const sw = (m, min) => Math.max(min, m / scale);

  return (
    <svg className="cm-svg" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <rect width={w} height={h} className="cm-land" />
      {blocks}
      <path d={streets.join('')} className="cm-street" strokeWidth={sw(9, 1.5)} />
      <path d={seaPath} className="cm-sea" />
      <path d={beach} className="cm-beach" strokeWidth={sw(26, 3)} />
      {ROADS.map((r) => (
        <g key={r.name}>
          <path d={line(r.pts)} className={`cm-road-case cm-${r.kind}`} strokeWidth={sw(r.kind === 'hwy' ? 34 : 24, 4) + 2} />
          <path d={line(r.pts)} className={`cm-road cm-${r.kind}`} strokeWidth={sw(r.kind === 'hwy' ? 34 : 24, 4)} />
        </g>
      ))}
      <path d={line(RAIL)} className="cm-rail" strokeWidth={sw(10, 3)} />
      <path d={line(RAIL)} className="cm-rail-dash" strokeWidth={sw(6, 1.6)} />
      {scale < 9 && ROADS.filter((r) => r.kind !== 'bridge').map((r) => {
        const mid = r.pts[Math.floor(r.pts.length / 2)];
        const prev = r.pts[Math.floor(r.pts.length / 2) - 1] || r.pts[0];
        const p = geo(mid[0], mid[1]); const q = geo(prev[0], prev[1]);
        let ang = (Math.atan2(p.y - q.y, p.x - q.x) * 180) / Math.PI;
        if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
        if (p.x < -60 || p.x > w + 60 || p.y < -20 || p.y > h + 20) return null;
        return <text key={r.name} x={p.x} y={p.y} transform={`rotate(${ang} ${p.x} ${p.y})`} className="cm-road-label" dy="3.5">{r.name}</text>;
      })}
      {AREAS.map(([n, la, ln]) => {
        const p = geo(la, ln);
        if (p.x < -80 || p.x > w + 80 || p.y < -20 || p.y > h + 20) return null;
        return <text key={n} x={p.x} y={p.y} className="cm-area">{n.toUpperCase()}</text>;
      })}
      {(() => { const p = geo(LAT0 + cm.y / MY, coastLng(LAT0 + cm.y / MY) - 0.012); return p.x > 30 ? <text x={p.x} y={h / 2} className="cm-sea-label">Arabian Sea</text> : null; })()}
    </svg>
  );
}

function useSize(ref) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const set = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

/**
 * markers: [{ id, lat, lng, node, z }]
 * fit: array of {lat,lng} to frame when it changes
 */
export default function CityMap({ center, scale: initialScale = 2.2, markers = [], fit, interactive = true, className = '', onMoveEnd, overlay, children, focus }) {
  const ref = useRef(null);
  const { w, h } = useSize(ref);
  const [cm, setCm] = useState(() => toM(center));
  const [scale, setScale] = useState(initialScale);
  const drag = useRef(null);

  const fitKey = fit ? fit.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join('|') : '';
  useEffect(() => {
    if (!fit || !fit.length || !w || !h) return;
    const ms = fit.map(toM);
    const xs = ms.map((m) => m.x); const ys = ms.map((m) => m.y);
    const pad = 56;
    const sx = (Math.max(...xs) - Math.min(...xs)) / Math.max(40, w - pad * 2);
    const sy = (Math.max(...ys) - Math.min(...ys)) / Math.max(40, h - pad * 2);
    setScale(Math.min(7, Math.max(1.1, sx, sy)));
    setCm({ x: (Math.max(...xs) + Math.min(...xs)) / 2, y: (Math.max(...ys) + Math.min(...ys)) / 2 });
  }, [fitKey, w, h]); // eslint-disable-line react-hooks/exhaustive-deps

  const centerKey = `${center.lat.toFixed(5)},${center.lng.toFixed(5)}`;
  useEffect(() => { if (!fit) setCm(toM(center)); }, [centerKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // keep a focused marker in view
  useEffect(() => {
    if (!focus || !w) return;
    const m = toM(focus);
    const sx = w / 2 + (m.x - cm.x) / scale; const sy = h / 2 - (m.y - cm.y) / scale;
    if (sx < 40 || sx > w - 40 || sy < 50 || sy > h - 30) setCm(m);
  }, [focus && focus.lat, focus && focus.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  const zoom = useCallback((f) => setScale((s) => Math.min(9, Math.max(0.7, s * f))), []);

  const onPointerDown = (e) => {
    if (!interactive || e.target.closest('.cm-pin, .cm-zoom')) return;
    drag.current = { x: e.clientX, y: e.clientY, cm, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.x; const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    setCm({ x: d.cm.x - dx * scale, y: d.cm.y + dy * scale });
  };
  const onPointerUp = () => {
    const d = drag.current; drag.current = null;
    if (d && d.moved && onMoveEnd) onMoveEnd(fromM(cm));
  };
  const onWheel = (e) => { if (!interactive) return; zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15); };

  const toS = (p) => { const m = toM(p); return { x: w / 2 + (m.x - cm.x) / scale, y: h / 2 - (m.y - cm.y) / scale }; };

  return (
    <div ref={ref} className={`cm ${interactive ? 'cm--live' : ''} ${className}`}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onWheel={onWheel}>
      {w > 0 && <MapArt w={w} h={h} cm={cm} scale={scale} />}
      {w > 0 && children && children({ toS, scale })}
      {w > 0 && markers.map((mk) => {
        const p = toS(mk);
        if (p.x < -60 || p.x > w + 60 || p.y < -60 || p.y > h + 60) return null;
        return <div key={mk.id} className="cm-pin" style={{ transform: `translate(${p.x}px, ${p.y}px)`, zIndex: mk.z || 1 }} onClick={mk.onClick}>{mk.node}</div>;
      })}
      {overlay}
      {interactive && (
        <div className="cm-zoom">
          <button onClick={() => zoom(1 / 1.4)} aria-label="Zoom in"><Plus size={17} /></button>
          <button onClick={() => zoom(1.4)} aria-label="Zoom out"><Minus size={17} /></button>
        </div>
      )}
      <span className="cm-credit">Illustrative map</span>
    </div>
  );
}

export { toM, fromM };

