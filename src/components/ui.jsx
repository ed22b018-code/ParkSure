import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, MapPin, LocateFixed, Car, Bike, Minus, Plus, Star, Footprints, Check, Clock } from 'lucide-react';
import { PLACES, CATEGORIES } from '../data/places.js';
import { SIZES, fmtDay, fmtTime, hrsLabel, nextSlot, startOfDay, inr, endOf, normalisePlate, AMENITIES, SPOT_TYPES } from '../lib/utils.js';
import SpotArt from './SpotArt.jsx';

export function Sheet({ open, onClose, title, children, footer, wide }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => { document.removeEventListener('keydown', onKey); document.body.classList.remove('no-scroll'); };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`sheet ${wide ? 'sheet--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet__grab" />
        <div className="sheet__head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="sheet__body">{children}</div>
        {footer && <div className="sheet__foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Stepper({ value, onChange, min = 1, max = 12, format = (v) => v }) {
  return (
    <div className="stepper">
      <button type="button" className="stepper__btn" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Decrease"><Minus size={18} /></button>
      <span className="stepper__val">{format(value)}</span>
      <button type="button" className="stepper__btn" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Increase"><Plus size={18} /></button>
    </div>
  );
}

export function WhenPicker({ start, hours, onDone, onClose, open }) {
  const [day, setDay] = useState(startOfDay(start));
  const [time, setTime] = useState(new Date(start));
  const [hrs, setHrs] = useState(hours);
  useEffect(() => { if (open) { setDay(startOfDay(start)); setTime(new Date(start)); setHrs(hours); } }, [open, start, hours]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = startOfDay(new Date()); d.setDate(d.getDate() + i); return d; }), []);
  const slots = useMemo(() => {
    const out = [];
    const first = startOfDay(day).getTime() === startOfDay(new Date()).getTime() ? nextSlot() : new Date(day.getTime() + 6 * 3600000);
    const d = new Date(first);
    const end = new Date(day.getTime() + 24 * 3600000);
    while (d < end) { out.push(new Date(d)); d.setMinutes(d.getMinutes() + 30); }
    return out;
  }, [day]);
  const chosen = slots.find((s) => s.getHours() === time.getHours() && s.getMinutes() === time.getMinutes()) || slots[0];
  const slotRef = useRef(null);
  useEffect(() => { slotRef.current?.querySelector('.is-on')?.scrollIntoView({ inline: 'center', block: 'nearest' }); }, [day, open]);

  return (
    <Sheet open={open} onClose={onClose} title="When do you need parking?"
      footer={<button className="btn btn--primary btn--block" disabled={!chosen} onClick={() => onDone(chosen, hrs)}>
        {chosen ? `${fmtDay(chosen)}, ${fmtTime(chosen)} – ${fmtTime(endOf(chosen, hrs))}` : 'Pick a time'}
      </button>}>
      <div className="field-label">Day</div>
      <div className="chips chips--scroll">
        {days.map((d) => (
          <button key={d.toISOString()} className={`chip chip--day ${d.getTime() === day.getTime() ? 'is-on' : ''}`} onClick={() => setDay(d)}>
            <small>{fmtDay(d) === 'Tomorrow' ? 'Tmrw' : fmtDay(d).split(',')[0]}</small>
            <b>{d.getDate()}</b>
          </button>
        ))}
      </div>
      <div className="field-label">Arriving at</div>
      <div className="chips chips--scroll" ref={slotRef}>
        {slots.map((s) => (
          <button key={s.toISOString()} className={`chip ${chosen && s.getTime() === chosen.getTime() ? 'is-on' : ''}`} onClick={() => setTime(s)}>{fmtTime(s)}</button>
        ))}
      </div>
      <div className="field-label">For how long?</div>
      <div className="row-between">
        <div className="chips">
          {[1, 2, 3, 4, 8].map((h) => (
            <button key={h} className={`chip ${hrs === h ? 'is-on' : ''}`} onClick={() => setHrs(h)}>{hrsLabel(h)}</button>
          ))}
        </div>
      </div>
      <div className="row-between mt-12">
        <span className="muted">Or set exactly</span>
        <Stepper value={hrs} onChange={setHrs} min={1} max={12} format={hrsLabel} />
      </div>
    </Sheet>
  );
}

export function VehiclePicker({ open, vehicle, onDone, onClose }) {
  const [v, setV] = useState(vehicle);
  useEffect(() => { if (open) setV(vehicle); }, [open, vehicle]);
  return (
    <Sheet open={open} onClose={onClose} title="What are you parking?"
      footer={<button className="btn btn--primary btn--block" onClick={() => onDone(v)}>Save vehicle</button>}>
      <div className="seg seg--big">
        <button className={v.type === 'car' ? 'is-on' : ''} onClick={() => setV({ ...v, type: 'car' })}><Car size={26} /><span>Car</span></button>
        <button className={v.type === 'bike' ? 'is-on' : ''} onClick={() => setV({ ...v, type: 'bike' })}><Bike size={26} /><span>Bike / scooter</span></button>
      </div>
      {v.type === 'car' && (
        <>
          <div className="field-label">Car size <span className="muted">— we only show spots it fits in</span></div>
          <div className="option-list">
            {Object.entries(SIZES).map(([k, s]) => (
              <button key={k} className={`option ${v.size === k ? 'is-on' : ''}`} onClick={() => setV({ ...v, size: k })}>
                <CarSizeIcon size={k} />
                <span className="option__text"><b>{s.label}</b><small>{s.eg}</small></span>
                <span className="radio" />
              </button>
            ))}
          </div>
        </>
      )}
      <label className="field-label" htmlFor="plate">Vehicle number <span className="muted">(optional now, needed for the gate pass)</span></label>
      <input id="plate" className="input input--plate" placeholder="MH 02 AB 1234" value={v.number} onChange={(e) => setV({ ...v, number: normalisePlate(e.target.value) })} />
    </Sheet>
  );
}

export function CarSizeIcon({ size }) {
  const w = { hatchback: 34, sedan: 42, suv: 44 }[size];
  const h = { hatchback: 15, sedan: 13, suv: 19 }[size];
  return (
    <svg className="size-ico" viewBox="0 0 52 30" aria-hidden="true">
      <rect x={(52 - w) / 2} y={26 - h - 4} width={w} height={h} rx="5" fill="currentColor" opacity=".9" />
      <rect x={(52 - w) / 2 + 6} y={26 - h - 10} width={w - 16} height="9" rx="4" fill="currentColor" opacity=".55" />
      <circle cx={(52 - w) / 2 + 8} cy="24" r="4" fill="#2B2622" /><circle cx={(52 + w) / 2 - 8} cy="24" r="4" fill="#2B2622" />
    </svg>
  );
}

const BBOX = '72.77,19.30,73.05,18.88';

export function PlaceSearch({ open, onClose, onPick, placeholder = 'Search a place, college, hospital…' }) {
  const [q, setQ] = useState('');
  const [remote, setRemote] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locErr, setLocErr] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { if (open) { setQ(''); setRemote([]); setLocErr(''); setTimeout(() => inputRef.current?.focus(), 50); } }, [open]);

  const local = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return PLACES.filter((p) => `${p.name} ${p.area} ${CATEGORIES[p.cat].label}`.toLowerCase().includes(s)).slice(0, 6);
  }, [q]);

  useEffect(() => {
    const s = q.trim();
    if (s.length < 3) { setRemote([]); return; }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=in&viewbox=${BBOX}&bounded=1&q=${encodeURIComponent(s)}`;
        const res = await fetch(url, { signal: ctl.signal, headers: { Accept: 'application/json' } });
        const data = await res.json();
        setRemote(data.map((d) => ({
          id: 'osm-' + d.place_id,
          name: d.display_name.split(',')[0],
          area: d.display_name.split(',').slice(1, 3).join(',').trim(),
          lat: +d.lat, lng: +d.lon, cat: 'landmark',
        })));
      } catch { /* offline or aborted */ }
      setLoading(false);
    }, 450);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q]);

  const useLocation = () => {
    if (!navigator.geolocation) { setLocErr('Location is not available on this device'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const inMumbai = lat > 18.85 && lat < 19.35 && lng > 72.75 && lng < 73.1;
        if (!inMumbai) { setLocErr("You're outside Mumbai — ParkSure is live in Mumbai first. Pick a place below to explore."); return; }
        onPick({ id: 'me', name: 'Current location', area: 'Near you', lat, lng, cat: 'landmark' });
      },
      () => setLocErr('Allow location access, or search for a place instead'),
      { timeout: 8000 },
    );
  };

  const groups = ['exam', 'hospital', 'mall', 'station'];
  if (!open) return null;
  return createPortal(
    <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Search destination">
      <div className="search-overlay__panel">
        <div className="search-overlay__bar">
          <Search size={20} className="muted" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label="Destination" />
          <button className="icon-btn" onClick={onClose} aria-label="Close search"><X size={20} /></button>
        </div>
        <div className="search-overlay__body">
          <button className="place-row place-row--loc" onClick={useLocation}>
            <span className="place-row__ico place-row__ico--green"><LocateFixed size={18} /></span>
            <span><b>Use my current location</b><small>Find parking around you right now</small></span>
          </button>
          {locErr && <p className="note note--warn">{locErr}</p>}
          {q.trim() ? (
            <>
              {local.map((p) => <PlaceRow key={p.id} p={p} onPick={onPick} />)}
              {remote.filter((r) => !local.some((l) => l.name === r.name)).map((p) => <PlaceRow key={p.id} p={p} onPick={onPick} />)}
              {loading && <p className="muted small pad">Searching more places…</p>}
              {!loading && !local.length && !remote.length && q.trim().length >= 3 && (
                <p className="muted small pad">No matches. Try a college, hospital, mall or station name.</p>
              )}
            </>
          ) : (
            groups.map((g) => (
              <div key={g}>
                <div className="field-label">{CATEGORIES[g].label}s</div>
                {PLACES.filter((p) => p.cat === g).map((p) => <PlaceRow key={p.id} p={p} onPick={onPick} />)}
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function PlaceRow({ p, onPick }) {
  return (
    <button className="place-row" onClick={() => onPick(p)}>
      <span className="place-row__ico"><MapPin size={18} /></span>
      <span><b>{p.name}</b><small>{CATEGORIES[p.cat]?.label} · {p.area}</small></span>
    </button>
  );
}

export function SpotCard({ item, hours, selected, onClick, onHover, compact, hint }) {
  const { spot, rate, walk, reason } = item;
  return (
    <button className={`spot-card ${selected ? 'is-sel' : ''} ${reason ? 'is-off' : ''} ${compact ? 'spot-card--compact' : ''} ${hint ? 'is-hint' : ''}`} onClick={onClick} onMouseEnter={onHover} data-spot={spot.id}>
      <SpotArt spot={spot} className="spot-card__art" />
      <div className="spot-card__main">
        <div className="spot-card__title">{SPOT_TYPES[spot.type].label} · {spot.society}</div>
        <div className="spot-card__meta">
          <span className="walk"><Footprints size={14} /> {walk} min walk</span>
          <span className="dot" />
          <span className="rating"><Star size={13} fill="currentColor" /> {spot.rating}</span>
        </div>
        <div className="spot-card__tags">
          {reason ? <span className="tag tag--warn"><Clock size={12} /> {reason}</span> : (
            <>
              {spot.amenities.slice(0, 2).map((a) => <span key={a} className="tag">{AMENITIES[a]}</span>)}
              {spot.access === 'society' && <span className="tag tag--green"><Check size={12} /> Society approved</span>}
            </>
          )}
        </div>
      </div>
      <div className="spot-card__price">
        <b>{inr(rate)}</b><small>/hr</small>
        {!reason && <span className="spot-card__total">{inr(rate * hours)} total</span>}
      </div>
    </button>
  );
}

export function Toast({ toast }) {
  if (!toast) return null;
  return createPortal(<div key={toast.id} className={`toast toast--${toast.tone}`} role="status">{toast.msg}</div>, document.body);
}

export function Logo({ small }) {
  return (
    <span className={`logo ${small ? 'logo--sm' : ''}`}>
      <svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#00B386" /><path d="M22 48V16h12.5c6.9 0 11.5 4.2 11.5 10.4S41.4 37 34.5 37H29v11z" fill="#fff" /><path d="M29 22.5v8.4h5c2.9 0 4.8-1.6 4.8-4.2s-1.9-4.2-4.8-4.2z" fill="#00B386" /><circle cx="46" cy="46" r="7" fill="#F5A524" stroke="#fff" strokeWidth="3" /></svg>
      <span>Park<b>Sure</b></span>
    </span>
  );
}

export function VehicleChipLabel({ vehicle }) {
  return vehicle.type === 'bike' ? 'Bike' : `Car · ${SIZES[vehicle.size].label}`;
}
