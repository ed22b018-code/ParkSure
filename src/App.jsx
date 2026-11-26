import React, { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Ticket, House, RotateCcw } from 'lucide-react';
import { useStore } from './lib/store.jsx';
import { Logo, Toast, Sheet } from './components/ui.jsx';
import HelpBot from './components/HelpBot.jsx';
import { bookingStatus } from './lib/utils.js';
import Home from './pages/Home.jsx';
import Results from './pages/Results.jsx';
import SpotPage from './pages/SpotPage.jsx';
import Checkout from './pages/Checkout.jsx';
import Pass from './pages/Pass.jsx';
import Bookings from './pages/Bookings.jsx';
import Host from './pages/Host.jsx';
import ListSpot from './pages/ListSpot.jsx';
import SharedPass from './pages/SharedPass.jsx';

const TABS = [
  { to: '/', label: 'Find parking', short: 'Park', icon: Search, end: true },
  { to: '/bookings', label: 'My bookings', short: 'Bookings', icon: Ticket },
  { to: '/host', label: 'Rent out your spot', short: 'Rent out', icon: House },
];

export default function App() {
  const { toast, myBookings, now, resetDemo, showToast } = useStore();
  const loc = useLocation();
  const nav = useNavigate();
  const [confirmReset, setConfirmReset] = useState(false);
  const doReset = () => {
    resetDemo();
    try { sessionStorage.clear(); } catch { /* ignore */ }
    setConfirmReset(false);
    nav('/');
    showToast('Demo reset · fresh start');
  };
  const p = loc.pathname;
  const dock = ['/', '/bookings', '/host'].includes(p) ? 'tabs' : (p.startsWith('/spot/') || p.startsWith('/checkout/') || p === '/host/new') ? 'cta' : p === '/search' ? 'map' : 'none';
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  const topLevel = ['/', '/bookings', '/host'].includes(loc.pathname);
  const live = myBookings.filter((b) => ['upcoming', 'active'].includes(bookingStatus(b, now))).length;

  return (
    <div className={`app ${topLevel ? 'has-tabs' : ''} dock-${dock}`}>
      <header className="topnav">
        <div className="topnav__inner">
          <Link to="/" aria-label="ParkSure home"><Logo /></Link>
          <nav className="topnav__links">
            {TABS.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `topnav__link ${isActive ? 'is-on' : ''}`}>
                {t.label}{t.to === '/bookings' && live > 0 && <span className="badge-dot">{live}</span>}
              </NavLink>
            ))}
          </nav>
          <span className="city-pill" title="Bengaluru coming soon">Mumbai</span>
          <button className="reset-btn" onClick={() => setConfirmReset(true)} title="Reset demo data on this device"><RotateCcw size={15} /><span>Reset</span></button>
        </div>
      </header>

      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Results />} />
          <Route path="/spot/:id" element={<SpotPage />} />
          <Route path="/checkout/:id" element={<Checkout />} />
          <Route path="/booking/:id" element={<Pass />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/host" element={<Host />} />
          <Route path="/host/new" element={<ListSpot />} />
          <Route path="/p/:token" element={<SharedPass />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>

      {topLevel && (
        <nav className="tabbar" aria-label="Main">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `tabbar__item ${isActive ? 'is-on' : ''}`}>
              <span className="tabbar__ico"><t.icon size={22} />{t.to === '/bookings' && live > 0 && <span className="badge-dot badge-dot--abs">{live}</span>}</span>
              <span>{t.short}</span>
            </NavLink>
          ))}
        </nav>
      )}
      <HelpBot key={loc.pathname.startsWith('/host') ? 'host' : 'driver'} />
      <Toast toast={toast} />
      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset the demo?"
        footer={<div className="btn-row btn-row--full"><button className="btn btn--ghost" onClick={() => setConfirmReset(false)}>Keep my data</button><button className="btn btn--primary" onClick={doReset}><RotateCcw size={16} /> Reset</button></div>}>
        <p className="muted">This clears your bookings, the spots you listed and your saved vehicle on this device, so the next person sees a fresh app. Sample spots and the sample host dashboard stay.</p>
      </Sheet>
    </div>
  );
}
