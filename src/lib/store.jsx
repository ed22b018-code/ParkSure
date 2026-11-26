import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SEED_SPOTS, buildDemoHostBookings } from '../data/seed.js';
import { uid } from './utils.js';

const KEY = 'parksure:v1';
const Ctx = createContext(null);

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* storage may be unavailable */ }
  return null;
}

const initial = () => ({
  deviceId: 'dev-' + uid(),
  vehicle: { type: 'car', size: 'sedan', number: '' },
  vehicleSet: false,
  host: { name: '', phone: '' },
  mySpots: [],
  spotEdits: {},
  bookings: [],
  hostView: 'me', // 'me' | 'demo'
});

export function StoreProvider({ children }) {
  const [state, setState] = useState(() => ({ ...initial(), ...(load() || {}) }));
  const [toast, setToast] = useState(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const demoBookings = useMemo(() => buildDemoHostBookings(new Date()), []);

  const spots = useMemo(() => {
    const seeded = SEED_SPOTS.map((s) => (state.spotEdits[s.id] ? { ...s, ...state.spotEdits[s.id] } : s));
    return [...state.mySpots, ...seeded];
  }, [state.mySpots, state.spotEdits]);

  const bookings = useMemo(() => [...state.bookings, ...demoBookings], [state.bookings, demoBookings]);

  const showToast = useCallback((msg, tone = 'ok') => {
    setToast({ msg, tone, id: Date.now() });
    setTimeout(() => setToast((t) => (t && Date.now() - t.id >= 2400 ? null : t)), 2600);
  }, []);

  const api = useMemo(() => ({
    state,
    now,
    spots,
    bookings,
    myBookings: state.bookings.filter((b) => b.guestId === state.deviceId),
    hostId: state.hostView === 'demo' ? 'demo-host' : state.deviceId,
    getSpot: (id) => spots.find((s) => s.id === id),
    setVehicle: (v) => setState((s) => ({ ...s, vehicle: { ...s.vehicle, ...v }, vehicleSet: true })),
    setHost: (h) => setState((s) => ({ ...s, host: { ...s.host, ...h } })),
    setHostView: (v) => setState((s) => ({ ...s, hostView: v })),
    addBooking: (b) => setState((s) => ({ ...s, bookings: [b, ...s.bookings] })),
    updateBooking: (id, patch) => setState((s) => ({ ...s, bookings: s.bookings.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),
    addSpot: (sp) => setState((s) => ({ ...s, mySpots: [sp, ...s.mySpots], hostView: 'me' })),
    editSpot: (id, patch) => setState((s) => {
      if (s.mySpots.some((x) => x.id === id)) return { ...s, mySpots: s.mySpots.map((x) => (x.id === id ? { ...x, ...patch } : x)) };
      return { ...s, spotEdits: { ...s.spotEdits, [id]: { ...(s.spotEdits[id] || {}), ...patch } } };
    }),
    resetDemo: () => { const fresh = initial(); setState(fresh); },
    toast,
    showToast,
  }), [state, now, spots, bookings, toast, showToast]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);
