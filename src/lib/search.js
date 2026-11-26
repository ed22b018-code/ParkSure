import { PLACES } from '../data/places.js';
import { nextSlot, haversine, walkMins, fits, rateFor, unavailableReason } from './utils.js';

export function toQuery({ place, start, hours }) {
  const p = new URLSearchParams();
  if (PLACES.some((x) => x.id === place.id)) p.set('to', place.id);
  else { p.set('lat', place.lat.toFixed(5)); p.set('lng', place.lng.toFixed(5)); p.set('name', place.name); if (place.area) p.set('area', place.area); }
  p.set('at', String(new Date(start).getTime()));
  p.set('h', String(hours));
  return p.toString();
}

export function fromQuery(sp) {
  let place = PLACES.find((x) => x.id === sp.get('to'));
  if (!place && sp.get('lat')) {
    place = { id: 'custom', name: sp.get('name') || 'Pinned place', area: sp.get('area') || '', lat: +sp.get('lat'), lng: +sp.get('lng'), cat: 'landmark' };
  }
  let start = sp.get('at') ? new Date(+sp.get('at')) : nextSlot();
  if (start < new Date(Date.now() - 15 * 60000)) start = nextSlot();
  const hours = Math.min(12, Math.max(1, parseInt(sp.get('h') || '2', 10) || 2));
  return { place, start, hours };
}

export const RADIUS = 1500;

export function searchSpots({ spots, bookings, place, start, hours, vehicle }) {
  const fitting = [];
  let notFit = 0;
  for (const spot of spots) {
    const dist = haversine(place, spot);
    if (dist > RADIUS) continue;
    if (!fits(spot, vehicle)) { notFit++; continue; }
    const rate = rateFor(spot, vehicle.type);
    const reason = unavailableReason(spot, start, hours, bookings);
    fitting.push({ spot, dist, walk: walkMins(dist), rate, reason });
  }
  return { items: fitting, notFit };
}

export function saveLastSearch(s) {
  try { sessionStorage.setItem('parksure:last', toQuery(s)); } catch { /* ignore */ }
}
export function lastSearch() {
  try { const q = sessionStorage.getItem('parksure:last'); return q ? fromQuery(new URLSearchParams(q)) : null; } catch { return null; }
}
