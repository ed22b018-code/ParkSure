import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Plus, Minus, LocateFixed } from 'lucide-react';
import { coastLng, RIVER, PLACES } from '../data/places.js';

/*
  ParkSure's own Mumbai map, drawn in SVG so it always loads (no map tiles or API keys).
  Real geography — coastline, Mithi river, Western Railway, named arterials, parks and landmarks —
  with a procedurally generated street network and buildings anchored to world coordinates,
  so panning and zooming behave like a real map.
*/

const LAT0 = 19.0;
const LNG0 = 72.8;
const MY = 111320;
const MX = 111320 * Math.cos((19.05 * Math.PI) / 180);

const toM = (p) => ({ x: (p.lng - LNG0) * MX, y: (p.lat - LAT0) * MY });
const fromM = (m) => ({ lat: LAT0 + m.y / MY, lng: LNG0 + m.x / MX });
const coastX = (yM) => (coastLng(LAT0 + yM / MY) - LNG0) * MX;

const ROADS = [
  { name: 'Western Express Highway', kind: 'hwy', pts: [[19.035, 72.851], [19.06, 72.853], [19.1, 72.855], [19.13, 72.857], [19.17, 72.862]] },
  { name: 'S.V. Road', kind: 'major', pts: [[19.045, 72.838], [19.07, 72.837], [19.1, 72.842], [19.13, 72.845], [19.17, 72.847]] },
  { name: 'Linking Road', kind: 'major', pts: [[19.058, 72.832], [19.08, 72.834], [19.11, 72.836], [19.14, 72.833], [19.165, 72.836]] },
  { name: 'Juhu Tara Road', kind: 'major', pts: [[19.072, 72.8262], [19.09, 72.8275], [19.108, 72.8285]] },
  { name: 'Hill Road', kind: 'major', pts: [[19.0545, 72.8395], [19.053, 72.832], [19.05, 72.8235]] },
  { name: 'Senapati Bapat Marg', kind: 'major', pts: [[18.985, 72.826], [19.0, 72.83], [19.02, 72.842], [19.035, 72.845]] },
  { name: 'Gokhale Road', kind: 'major', pts: [[19.012, 72.836], [19.022, 72.837], [19.032, 72.836]] },
  { name: 'Veer Savarkar Marg', kind: 'major', pts: [[19.008, 72.8255], [19.02, 72.833], [19.035, 72.8375]] },
  { name: 'Andheri–Kurla Road', kind: 'major', pts: [[19.119, 72.848], [19.115, 72.86], [19.108, 72.875]] },
  { name: 'J.P. Road', kind: 'major', pts: [[19.12, 72.845], [19.128, 72.835], [19.135, 72.826]] },
  { name: 'Bandra Kurla Complex Road', kind: 'major', pts: [[19.052, 72.853], [19.06, 72.862], [19.066, 72.872]] },
  { name: 'JVLR', kind: 'major', pts: [[19.14, 72.85], [19.142, 72.865], [19.14, 72.88]] },
  { name: 'Mahim Causeway', kind: 'major', pts: [[19.035, 72.8375], [19.042, 72.838], [19.0505, 72.8395]] },
  { name: 'Bandra–Worli Sea Link', kind: 'bridge', pts: [[19.044, 72.8175], [19.03, 72.8125], [19.012, 72.8115]] },
];
const RAIL = [[18.988, 72.8255], [19.0, 72.832], [19.019, 72.843], [19.035, 72.843], [19.054, 72.8405], [19.07, 72.8405], [19.09, 72.843], [19.119, 72.8465], [19.14, 72.848], [19.165, 72.849]];
const STATIONS = [['Lower Parel', 18.9955, 72.8297], ['Prabhadevi', 19.0095, 72.8378], ['Dadar', 19.019, 72.843], ['Matunga Road', 19.0285, 72.8448], ['Mahim Jn', 19.0412, 72.8418], ['Bandra', 19.0544, 72.8405], ['Khar Road', 19.0693, 72.8399], ['Santacruz', 19.0817, 72.8414], ['Vile Parle', 19.0995, 72.8437], ['Andheri', 19.1197, 72.8465], ['Jogeshwari', 19.1365, 72.8485], ['Goregaon', 19.1647, 72.8493]];
const PARKS = [
  ['Shivaji Park', 19.027, 72.8381, 190, 150], ['Joggers Park', 19.0645, 72.8247, 70, 110], ['Juhu Garden', 19.1005, 72.8275, 80, 60],
  ['Five Gardens', 19.027, 72.8575, 140, 100], ['Mahim Nature Park', 19.0475, 72.852, 160, 110], ['MMRDA Grounds', 19.0675, 72.8625, 170, 120],
  ['Aarey Milk Colony', 19.158, 72.875, 700, 600], ['Kamala Nehru Park', 19.0895, 72.8335, 60, 50], ['Patwardhan Park', 19.0612, 72.8345, 55, 45],
  ['Lokhandwala Garden', 19.141, 72.826, 70, 55],
];
const AREAS = [
  ['LOWER PAREL', 18.9985, 72.8335], ['WORLI', 19.006, 72.8185], ['PRABHADEVI', 19.0145, 72.8295], ['DADAR WEST', 19.0215, 72.8395],
  ['MATUNGA', 19.028, 72.853], ['MAHIM', 19.0385, 72.8445], ['BANDRA WEST', 19.0595, 72.8295], ['BANDRA EAST', 19.059, 72.8475],
  ['BKC', 19.0655, 72.8685], ['KHAR WEST', 19.0715, 72.8345], ['SANTACRUZ WEST', 19.0835, 72.8375], ['JUHU', 19.1065, 72.8305],
  ['VILE PARLE EAST', 19.1, 72.851], ['ANDHERI WEST', 19.1315, 72.8335], ['ANDHERI EAST', 19.1145, 72.8655], ['VERSOVA', 19.1355, 72.8175],
  ['GOREGAON EAST', 19.1585, 72.856], ['KALINA', 19.0755, 72.8605],
];
const STREET_NAMES = ['Turner Rd', 'Pali Hill Rd', 'Chapel Rd', 'St. John Baptist Rd', 'Nehru Rd', 'Tilak Rd', 'Station Rd', 'Ram Mandir Rd', 'Gulmohar Rd', 'M.G. Rd', 'Ambedkar Rd', 'Ranade Rd', 'Azad Rd', 'Hanuman Rd', 'Mount Mary Rd', 'Waterfield Rd', 'Perry Rd', 'Church Rd', 'Yari Rd', 'Dadabhai Rd', 'Swami Vivekanand Rd', 'Sant Dnyaneshwar Marg', 'Mogul Ln', 'Lady Jamshedji Rd', 'Bajaj Rd', 'Irla Ln', 'Shraddhanand Rd', 'Kher Nagar Rd', 'Patel Rd', 'Agarkar Rd'];
const POI_KINDS = [
  { k: 'food', color: '#E8853A', names: ['Cafe Madras', 'Kyani & Co.', 'Chai Point', 'Prakash Shakahari', 'Blue Tokai', 'Shiv Sagar', 'Theobroma', 'Third Wave Coffee'] },
  { k: 'shop', color: '#3F86D8', names: ['DMart', 'Reliance Smart', 'Croma', 'Westside', 'Apollo Pharmacy', 'Wellness Forever', 'Crossword'] },
  { k: 'health', color: '#E0524A', names: ['City Clinic', 'Lifeline Hospital', 'Suburban Diagnostics', 'Sai Nursing Home'] },
  { k: 'edu', color: '#8A6CC9', names: ['St. Xavier’s School', 'Podar School', 'Jamnabai School', 'Sathaye College'] },
  { k: 'worship', color: '#C9832B', names: ['Hanuman Mandir', 'St. Andrew’s Church', 'Ganesh Mandir', 'Jama Masjid'] },
  { k: 'bank', color: '#5F7A8C', names: ['HDFC Bank', 'SBI', 'ICICI Bank', 'Axis Bank', 'Kotak Bank'] },
];
const CAT_COLOR = { exam: '#8A6CC9', hospital: '#E0524A', mall: '#3F86D8', market: '#3F86D8', station: '#5F7A8C', temple: '#C9832B', event: '#D2508A', beach: '#2E9CC4', landmark: '#3E9B5F' };

function hash(a, b, c = 0) {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const CELL = 150;
// warped grid intersections give organic, non-orthogonal streets
function node(i, j) {
  return {
    x: i * CELL + (hash(i, j, 1) - 0.5) * 70 + Math.sin(j * 0.45 + i * 0.13) * 38,
    y: j * CELL + (hash(i, j, 2) - 0.5) * 70 + Math.sin(i * 0.38 - j * 0.11) * 38,
  };
}
const isSecV = (i) => ((i % 4) + 4) % 4 === 0;
const isSecH = (j) => ((j % 5) + 5) % 5 === 0;
const onLand = (m) => m.x > coastX(m.y) + 25;

function MapArt({ w, h, cm, scale, hide }) {
  const toS = (m) => ({ x: w / 2 + (m.x - cm.x) / scale, y: h / 2 - (m.y - cm.y) / scale });
  const geo = (lat, lng) => toS(toM({ lat, lng }));
  const fmt = (p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  const pad = CELL * 2;
  const minX = cm.x - (w / 2) * scale - pad; const maxX = cm.x + (w / 2) * scale + pad;
  const minY = cm.y - (h / 2) * scale - pad; const maxY = cm.y + (h / 2) * scale + pad;
  const sw = (m, min) => Math.max(min, m / scale);
  const line = (pts) => 'M' + pts.map(([la, ln]) => fmt(geo(la, ln))).join('L');
  const inView = (p, m = 60) => p.x > -m && p.x < w + m && p.y > -m && p.y < h + m;

  const sea = [];
  for (let k = 0; k <= 48; k++) { const yM = maxY - ((maxY - minY) * k) / 48; sea.push(fmt(toS({ x: coastX(yM), y: yM }))); }
  const seaPath = `M-60,${toS({ x: 0, y: maxY }).y} L${sea.join(' L')} L-60,${toS({ x: 0, y: minY }).y} Z`;

  const minor = []; const secondary = []; const buildings = []; const greens = []; const labels = []; const pois = [];
  const showStreets = scale <= 8;
  const showBuildings = scale <= 3;
  if (showStreets) {
    const i0 = Math.floor(minX / CELL); const i1 = Math.ceil(maxX / CELL);
    const j0 = Math.floor(minY / CELL); const j1 = Math.ceil(maxY / CELL);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const A = node(i, j); const B = node(i + 1, j); const C = node(i + 1, j + 1); const D = node(i, j + 1);
        const landA = onLand(A); const landB = onLand(B); const landD = onLand(D); const landC = onLand(C);
        if (landA && landB) {
          const sec = isSecH(j);
          if (sec || hash(i, j, 3) > 0.14) {
            (sec ? secondary : minor).push(`M${fmt(toS(A))}L${fmt(toS(B))}`);
            if (sec && scale < 3.4 && ((i % 5) + 5) % 5 === 2) labels.push({ a: A, b: B, name: STREET_NAMES[Math.floor(hash(0, j, 9) * STREET_NAMES.length)] });
          }
        }
        if (landA && landD) {
          const sec = isSecV(i);
          if (sec || hash(i, j, 4) > 0.2) {
            (sec ? secondary : minor).push(`M${fmt(toS(A))}L${fmt(toS(D))}`);
            if (sec && scale < 3.4 && ((j % 6) + 6) % 6 === 3) labels.push({ a: A, b: D, name: STREET_NAMES[Math.floor(hash(i, 0, 8) * STREET_NAMES.length)] });
          }
        }
        if (landA && landC && hash(i, j, 5) < 0.05) minor.push(`M${fmt(toS(A))}L${fmt(toS(C))}`);
        if (!(landA && landB && landC && landD)) continue;
        const r = hash(i, j, 6);
        const quad = (u, v) => ({
          x: (1 - u) * (1 - v) * A.x + u * (1 - v) * B.x + u * v * C.x + (1 - u) * v * D.x,
          y: (1 - u) * (1 - v) * A.y + u * (1 - v) * B.y + u * v * C.y + (1 - u) * v * D.y,
        });
        if (r < 0.03) {
          const pts = [quad(0.12, 0.12), quad(0.88, 0.12), quad(0.88, 0.88), quad(0.12, 0.88)].map((p) => fmt(toS(p)));
          greens.push(<path key={`g${i}_${j}`} d={`M${pts.join('L')}Z`} className="cm-park" />);
        } else if (showBuildings) {
          const n = 3 + Math.floor(hash(j, i, 7) * 5);
          for (let k = 0; k < n; k++) {
            const u0 = 0.1 + hash(i, j, 20 + k) * 0.6; const v0 = 0.1 + hash(i, j, 40 + k) * 0.6;
            const du = Math.min(0.9 - u0, 0.1 + hash(i, j, 60 + k) * 0.22); const dv = Math.min(0.9 - v0, 0.1 + hash(i, j, 80 + k) * 0.22);
            const pts = [quad(u0, v0), quad(u0 + du, v0), quad(u0 + du, v0 + dv), quad(u0, v0 + dv)].map((p) => fmt(toS(p)));
            buildings.push(`M${pts.join('L')}Z`);
          }
        }
        if (scale < 3.2 && hash(i, j, 11) < 0.07) {
          const kind = POI_KINDS[Math.floor(hash(i, j, 12) * POI_KINDS.length)];
          const p = toS(quad(0.5, 0.5));
          if (inView(p, 20)) pois.push({ key: `p${i}_${j}`, p, color: kind.color, name: kind.names[Math.floor(hash(j, i, 13) * kind.names.length)] });
        }
      }
    }
  }

  return (
    <svg className="cm-svg" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <rect width={w} height={h} className="cm-land" />
      {PARKS.map(([n, la, ln, rx, ry]) => { const p = geo(la, ln); return <ellipse key={n} cx={p.x} cy={p.y} rx={rx / scale} ry={ry / scale} className="cm-park" />; })}
      {greens}
      {showBuildings && <path d={buildings.join('')} className="cm-bldg" />}
      <path d={line(RIVER)} className="cm-river" strokeWidth={sw(70, 5)} />
      <path d={seaPath} className="cm-sea" />
      <path d={'M' + sea.join('L')} className="cm-beach" strokeWidth={sw(24, 2)} />
      <path d={minor.join('')} className="cm-minor-case" strokeWidth={sw(9, 1.4) + 1.4} />
      <path d={secondary.join('')} className="cm-sec-case" strokeWidth={sw(15, 2.4) + 1.8} />
      <path d={minor.join('')} className="cm-minor" strokeWidth={sw(9, 1.4)} />
      <path d={secondary.join('')} className="cm-sec" strokeWidth={sw(15, 2.4)} />
      {ROADS.map((r) => <path key={r.name + 'c'} d={line(r.pts)} className={`cm-road-case cm-${r.kind}`} strokeWidth={sw(r.kind === 'hwy' ? 36 : 24, r.kind === 'hwy' ? 5 : 4) + 2.2} />)}
      {ROADS.map((r) => <path key={r.name} d={line(r.pts)} className={`cm-road cm-${r.kind}`} strokeWidth={sw(r.kind === 'hwy' ? 36 : 24, r.kind === 'hwy' ? 5 : 4)} />)}
      <path d={line(RAIL)} className="cm-rail" strokeWidth={sw(9, 2.6)} />
      <path d={line(RAIL)} className="cm-rail-dash" strokeWidth={sw(5, 1.4)} />
      {scale < 6 && STATIONS.map(([n, la, ln]) => { const p = geo(la, ln); return inView(p) ? (
        <g key={n}><rect x={p.x - 5} y={p.y - 5} width="10" height="10" rx="3" className="cm-station" /><text x={p.x + 9} y={p.y + 4} className="cm-station-label">{n}</text></g>
      ) : null; })}
      {labels.map((l, k) => {
        const a = toS(l.a); const b = toS(l.b);
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        if (len < l.name.length * 5.6) return null;
        let ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
        if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
        const x = (a.x + b.x) / 2; const y = (a.y + b.y) / 2;
        return <text key={k} x={x} y={y} dy="3.3" transform={`rotate(${ang} ${x} ${y})`} className="cm-street-label">{l.name}</text>;
      })}
      {scale < 10 && ROADS.map((r) => {
        const m = Math.floor(r.pts.length / 2); const [la1, ln1] = r.pts[m - 1] || r.pts[0]; const [la2, ln2] = r.pts[m];
        const a = geo(la1, ln1); const b = geo(la2, ln2);
        const x = (a.x + b.x) / 2; const y = (a.y + b.y) / 2;
        if (!inView({ x, y }, 80)) return null;
        let ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
        if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
        return <text key={r.name} x={x} y={y} dy="3.6" transform={`rotate(${ang} ${x} ${y})`} className={`cm-road-label ${r.kind === 'hwy' ? 'is-hwy' : ''}`}>{r.name}</text>;
      })}
      {pois.map((q) => (
        <g key={q.key}>
          <circle cx={q.p.x} cy={q.p.y} r="5" fill={q.color} stroke="#fff" strokeWidth="1.5" />
          {scale < 1.9 && <text x={q.p.x + 9} y={q.p.y + 3.5} fill={q.color} className="cm-poi-label">{q.name}</text>}
        </g>
      ))}
      {scale < 5 && PARKS.map(([n, la, ln]) => { const p = geo(la, ln); return inView(p) ? <text key={'pl' + n} x={p.x} y={p.y + 4} className="cm-park-label">{n}</text> : null; })}
      {PLACES.map((pl) => { const p = geo(pl.lat, pl.lng); return inView(p) && pl.id !== hide ? (
        <g key={pl.id}>
          <circle cx={p.x} cy={p.y} r="7" fill={CAT_COLOR[pl.cat]} stroke="#fff" strokeWidth="2" />
          <circle cx={p.x} cy={p.y} r="2.4" fill="#fff" />
          <text x={p.x + 11} y={p.y + 4} fill={CAT_COLOR[pl.cat]} className="cm-place-label">{pl.name}</text>
        </g>
      ) : null; })}
      {AREAS.map(([n, la, ln]) => { const p = geo(la, ln); return inView(p, 80) ? <text key={n} x={p.x} y={p.y} className="cm-area">{n}</text> : null; })}
      {(() => { const x = toS({ x: coastX(cm.y) - 1300, y: cm.y }).x; return x > 40 ? <text x={x} y={h / 2 + 40} className="cm-sea-label">Arabian Sea</text> : null; })()}
    </svg>
  );
}

function useSize(ref) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    if (!ref.current) return undefined;
    const el = ref.current;
    const set = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

export default function CityMap({ center, scale: initialScale = 2.2, markers = [], fit, interactive = true, className = '', onMoveEnd, overlay, children, focus, hidePlace }) {
  const ref = useRef(null);
  const { w, h } = useSize(ref);
  const [cm, setCm] = useState(() => toM(center));
  const [scale, setScale] = useState(initialScale);
  const drag = useRef(null);
  const home = useRef(null);

  const fitKey = fit ? fit.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join('|') : '';
  useEffect(() => {
    if (!fit || !fit.length || !w || !h) return;
    const ms = fit.map(toM);
    const xs = ms.map((m) => m.x); const ys = ms.map((m) => m.y);
    const pad = 60;
    const sx = (Math.max(...xs) - Math.min(...xs)) / Math.max(40, w - pad * 2);
    const sy = (Math.max(...ys) - Math.min(...ys)) / Math.max(40, h - pad * 2);
    const s = Math.min(6, Math.max(1.1, sx, sy));
    const c = { x: (Math.max(...xs) + Math.min(...xs)) / 2, y: (Math.max(...ys) + Math.min(...ys)) / 2 };
    home.current = { s, c };
    setScale(s); setCm(c);
  }, [fitKey, w, h]); // eslint-disable-line react-hooks/exhaustive-deps

  const centerKey = `${center.lat.toFixed(5)},${center.lng.toFixed(5)}`;
  useEffect(() => { if (!fit) setCm(toM(center)); }, [centerKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!focus || !w) return;
    const m = toM(focus);
    const sx = w / 2 + (m.x - cm.x) / scale; const sy = h / 2 - (m.y - cm.y) / scale;
    if (sx < 40 || sx > w - 40 || sy < 50 || sy > h - 30) setCm(m);
  }, [focus && focus.lat, focus && focus.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  const zoom = useCallback((f) => setScale((s) => Math.min(9, Math.max(0.6, s * f))), []);

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
      {w > 0 && <MapArt w={w} h={h} cm={cm} scale={scale} hide={hidePlace} />}
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
          <button onClick={() => { if (home.current) { setScale(home.current.s); setCm(home.current.c); } else { setScale(initialScale); setCm(toM(center)); } }} aria-label="Recentre"><LocateFixed size={16} /></button>
        </div>
      )}
      <span className="cm-credit">ParkSure map · illustrative</span>
    </div>
  );
}

export { toM, fromM };
