export const SIZES = {
  hatchback: { label: 'Hatchback', eg: 'Swift, i20, Baleno', rank: 1 },
  sedan: { label: 'Sedan', eg: 'City, Verna, Dzire', rank: 2 },
  suv: { label: 'SUV', eg: 'Creta, XUV700, Fortuner', rank: 3 },
};

export const sizeWord = (k) => (k === 'suv' ? 'SUV' : SIZES[k].label.toLowerCase());

export const SPOT_TYPES = {
  basement: { label: 'Basement', desc: 'Underground, covered' },
  stilt: { label: 'Stilt', desc: 'Under the building, covered' },
  open: { label: 'Open', desc: 'Compound or open plot' },
  garage: { label: 'Private garage', desc: 'Lockable, independent' },
};

export const AMENITIES = {
  covered: 'Covered',
  cctv: 'CCTV',
  guard: 'Security guard',
  ev: 'EV charging',
};

export const ACCESS = {
  society: { label: 'Housing society', badge: 'Society approved' },
  independent: { label: 'Independent house', badge: 'Private property' },
  commercial: { label: 'Commercial building', badge: 'Managed building' },
};

export const PLATFORM_FEE = 10;

export function haversine(a, b) {
  const R = 6371000;
  const toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat);
  const dLng = toR(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// Straight-line distance * 1.3 for real streets, ~75 m per minute walking
export const walkMins = (m) => Math.max(1, Math.round((m * 1.3) / 75));
export const fmtDist = (m) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`);

export const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

export function fmtTime(d) {
  d = new Date(d);
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', ' ').toUpperCase();
}

export function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

export function fmtDay(d, now = new Date()) {
  d = new Date(d);
  const diff = Math.round((startOfDay(d) - startOfDay(now)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export const hrsLabel = (h) => (h === 1 ? '1 hr' : `${h} hrs`);
export const endOf = (start, hours) => new Date(new Date(start).getTime() + hours * 3600000);

export function fmtWindow(start, hours) {
  return `${fmtDay(start)}, ${fmtTime(start)} – ${fmtTime(endOf(start, hours))}`;
}

export function nextSlot(now = new Date()) {
  const d = new Date(now);
  d.setSeconds(0, 0);
  const m = d.getMinutes();
  d.setMinutes(m <= 0 ? 0 : m <= 30 ? 30 : 60);
  if (d - now < 10 * 60000) d.setMinutes(d.getMinutes() + 30);
  return d;
}

export function fmtHours([from, to]) {
  if (from === 0 && to === 24) return 'Open 24 hours';
  const f = (h) => fmtTime(new Date(2026, 0, 1, h, 0));
  return `${f(from)} – ${f(to === 24 ? 0 : to)}`;
}

export const DAYS_LABEL = { all: 'Every day', weekdays: 'Mon – Fri', weekends: 'Sat & Sun' };

export function fits(spot, vehicle) {
  if (vehicle.type === 'bike') return spot.vehicles.includes('bike');
  if (!spot.vehicles.includes('car')) return false;
  return SIZES[spot.maxSize].rank >= SIZES[vehicle.size || 'sedan'].rank;
}

export function rateFor(spot, vehicleType) {
  return vehicleType === 'bike' ? spot.bikePrice : spot.carPrice;
}

function openDuring(spot, start, hours) {
  const s = new Date(start);
  const e = endOf(start, hours);
  const dow = s.getDay();
  if (spot.days === 'weekdays' && (dow === 0 || dow === 6)) return false;
  if (spot.days === 'weekends' && dow > 0 && dow < 6) return false;
  const [from, to] = spot.hours;
  if (from === 0 && to === 24) return true;
  const sh = s.getHours() + s.getMinutes() / 60;
  const sameDay = startOfDay(s).getTime() === startOfDay(new Date(e.getTime() - 1)).getTime();
  const eh = sameDay ? e.getHours() + e.getMinutes() / 60 || 24 : 99;
  return sh >= from && eh <= to;
}

export function overlaps(b, start, hours) {
  const s1 = new Date(b.start).getTime();
  const e1 = endOf(b.start, b.hours + (b.extraHours || 0)).getTime();
  const s2 = new Date(start).getTime();
  const e2 = endOf(start, hours).getTime();
  return s1 < e2 && s2 < e1;
}

// Returns null if bookable, otherwise a short reason
export function unavailableReason(spot, start, hours, bookings, ignoreId) {
  if (!spot.active) return 'Host has paused this spot';
  if (!openDuring(spot, start, hours)) return `Open ${DAYS_LABEL[spot.days].toLowerCase()}, ${fmtHours(spot.hours).toLowerCase()}`;
  const clash = bookings.some((b) => b.spotId === spot.id && b.id !== ignoreId && b.status !== 'cancelled' && b.status !== 'refunded' && overlaps(b, start, hours));
  if (clash) return 'Already booked for this time';
  return null;
}

export function bookingStatus(b, now = new Date()) {
  if (b.status === 'cancelled') return 'cancelled';
  if (b.status === 'refunded') return 'refunded';
  const s = new Date(b.start);
  const e = endOf(b.start, b.hours + (b.extraHours || 0));
  if (now < s) return 'upcoming';
  if (now < e) return 'active';
  return 'completed';
}

export function durationText(ms) {
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h >= 24) { const d = Math.floor(h / 24); return `${d} day${d > 1 ? 's' : ''}${h % 24 ? ` ${h % 24} hr` : ''}`; }
  return `${h} hr${h > 1 ? 's' : ''}${m ? ` ${m} min` : ''}`;
}

export function makeCode() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'PS-';
  for (let i = 0; i < 5; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function spotTitle(spot) {
  return `${SPOT_TYPES[spot.type].label} · ${spot.society}`;
}

export function normalisePlate(v) {
  return v.toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').slice(0, 13);
}
export function formatPlate(v) {
  const m = v.trim().toUpperCase().replace(/\s+/g, '').match(/^([A-Z]{2})(\d{1,2})([A-Z]{0,3})(\d{3,4})$/);
  return m ? [m[1], m[2].padStart(2, '0'), m[3], m[4]].filter(Boolean).join(' ') : v.trim().toUpperCase();
}
export const plateValid = (v) => /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{3,4}$/.test(v.trim().toUpperCase().replace(/\s+/g, ''));

export function mapsLink(spot) {
  return `https://www.google.com/maps/dir/?api=1&destination=${spot.lat.toFixed(6)},${spot.lng.toFixed(6)}`;
}
