import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Wallet, Clock, Plus, Minus, Car, Bike, Eye, BadgeCheck, CalendarCheck, Sparkles, TrendingUp } from 'lucide-react';
import { useStore } from '../lib/store.jsx';
import { AREAS } from '../data/places.js';
import { SPOT_TYPES, inr, fmtDay, fmtTime, endOf, bookingStatus, hrsLabel, fmtHours, DAYS_LABEL } from '../lib/utils.js';
import SpotArt from '../components/SpotArt.jsx';

export const BOOKED_SHARE = 0.35;
export const estimateMonthly = (price, hoursPerDay) => Math.round((price * hoursPerDay * BOOKED_SHARE * 30) / 100) * 100;

export default function Host() {
  const { state, spots, setHostView } = useStore();
  const mine = spots.filter((s) => s.hostId === state.deviceId);
  if (state.hostView === 'demo' || mine.length) return <Dashboard />;
  return <Landing onDemo={() => setHostView('demo')} />;
}

function Landing({ onDemo }) {
  const nav = useNavigate();
  const [area, setArea] = useState('Bandra W');
  const [hrs, setHrs] = useState(10);
  const [type, setType] = useState('car');
  const [lo, hi] = AREAS[area].band;
  const carMid = Math.round((lo + hi) / 2 / 10) * 10;
  const price = type === 'car' ? carMid : Math.max(15, Math.round((carMid * 0.3) / 5) * 5);
  const est = estimateMonthly(price, hrs);

  return (
    <div className="page host-landing">
      <section className="host-hero">
        <div className="host-hero__copy">
          <span className="eyebrow"><Sparkles size={15} /> For residents & building owners</span>
          <h1>Your empty parking spot can pay for itself.</h1>
          <p className="lead">Rent it out for the hours you're away. You choose the hours and the price. Every driver is booked and verified before they reach your gate.</p>
          <div className="btn-row">
            <button className="btn btn--primary btn--lg" onClick={() => nav('/host/new')}>List your spot <ArrowRight size={18} /></button>
            <button className="btn btn--ghost btn--lg" onClick={onDemo}><Eye size={18} /> See a sample dashboard</button>
          </div>
          <p className="muted small">Takes about 2 minutes. No fees to list.</p>
        </div>

        <div className="card estimator">
          <h3 className="card__title"><TrendingUp size={18} /> What could you earn?</h3>
          <label className="field-label" htmlFor="area">Your area</label>
          <select id="area" className="input" value={area} onChange={(e) => setArea(e.target.value)}>
            {Object.keys(AREAS).map((a) => <option key={a}>{a}</option>)}
          </select>
          <div className="field-label">Spot is for</div>
          <div className="seg">
            <button className={type === 'car' ? 'is-on' : ''} onClick={() => setType('car')}><Car size={16} /> Car</button>
            <button className={type === 'bike' ? 'is-on' : ''} onClick={() => setType('bike')}><Bike size={16} /> Bike</button>
          </div>
          <div className="field-label">Free for <b>{hrs} hrs</b> a day</div>
          <input type="range" min="2" max="24" step="1" value={hrs} onChange={(e) => setHrs(+e.target.value)} className="range" aria-label="Hours free per day" />
          <div className="estimator__out">
            <small>You could earn about</small>
            <b>{inr(est)}<span>/month</span></b>
            <small className="muted">At {inr(price)}/hr, if it's booked about a third of the time — typical for spots near busy places.</small>
          </div>
        </div>
      </section>

      <section className="section how">
        <h2>Simple for you, safe for your society</h2>
        <div className="how__grid">
          <div className="how__item"><span className="how__n"><CalendarCheck size={18} /></span><b>You set the rules</b><p>Pick days, hours and price. Pause anytime with one tap.</p></div>
          <div className="how__item"><span className="how__n"><BadgeCheck size={18} /></span><b>Known drivers only</b><p>Every booking comes with a vehicle number and a gate pass your security can check.</p></div>
          <div className="how__item"><span className="how__n"><Wallet size={18} /></span><b>Paid every Monday</b><p>You keep 100% of your price. Earnings go straight to your UPI.</p></div>
        </div>
      </section>
    </div>
  );
}

function Dashboard() {
  const nav = useNavigate();
  const { state, spots, bookings, hostId, setHostView, editSpot, now, showToast } = useStore();
  const isDemo = state.hostView === 'demo';
  const mySpots = spots.filter((s) => s.hostId === hostId);
  const ids = new Set(mySpots.map((s) => s.id));
  const hostBookings = bookings.filter((b) => ids.has(b.spotId) && b.status !== 'cancelled' && b.status !== 'refunded');
  const ownHasSpots = spots.some((s) => s.hostId === state.deviceId);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = hostBookings.filter((b) => new Date(b.start) >= monthStart && new Date(b.start) <= now);
  const earned = thisMonth.reduce((a, b) => a + b.amount + (b.extraAmount || 0), 0);
  const hoursBooked = thisMonth.reduce((a, b) => a + b.hours + (b.extraHours || 0), 0);
  const upcoming = hostBookings.filter((b) => ['upcoming', 'active'].includes(bookingStatus(b, now))).sort((a, c) => new Date(a.start) - new Date(c.start));
  const recent = hostBookings.filter((b) => bookingStatus(b, now) === 'completed').sort((a, c) => new Date(c.start) - new Date(a.start)).slice(0, 5);
  const nextMonday = useMemo(() => { const d = new Date(now); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); return d; }, [now]);
  const spotById = (id) => mySpots.find((s) => s.id === id);
  const hostName = isDemo ? 'Priya' : (state.host.name || '').split(' ')[0];

  return (
    <div className="page host-dash">
      {isDemo && (
        <div className="demo-banner">
          <Eye size={17} /> <span>You're viewing a <b>sample host dashboard</b>.</span>
          {ownHasSpots
            ? <button className="btn btn--sm btn--dark" onClick={() => setHostView('me')}>Back to my spots</button>
            : <button className="btn btn--sm btn--dark" onClick={() => { setHostView('me'); nav('/host/new'); }}>List my own spot</button>}
          {!ownHasSpots && <button className="btn btn--sm btn--link" onClick={() => setHostView('me')}>Exit</button>}
        </div>
      )}
      <div className="page-head">
        <div>
          <small className="muted">Hosting</small>
          <h1>{hostName ? `Hi ${hostName}` : 'Your spots'}</h1>
        </div>
        <button className="btn btn--primary" onClick={() => nav('/host/new')}><Plus size={17} /> Add spot</button>
      </div>

      <div className="dash-grid">
        <div className="card earn-card">
          <small>Earned in {now.toLocaleDateString('en-IN', { month: 'long' })}</small>
          <b className="earn-card__num">{inr(earned)}</b>
          <div className="earn-card__stats">
            <span><b>{thisMonth.length}</b> bookings</span>
            <span><b>{hoursBooked}</b> hrs booked</span>
            <span><b>{mySpots.length}</b> spot{mySpots.length > 1 ? 's' : ''}</span>
          </div>
          <div className="earn-card__payout"><Wallet size={16} /> Next payout {fmtDay(nextMonday)} · to your UPI</div>
        </div>

        <div className="card">
          <h3 className="card__title">Upcoming bookings</h3>
          {upcoming.length === 0 ? <p className="muted">No upcoming bookings yet. Spots with photos and longer hours get booked first.</p> : upcoming.map((b) => (
            <BookingLine key={b.id} b={b} spot={spotById(b.spotId)} now={now} />
          ))}
        </div>
      </div>

      <h2 className="h2">Your spots</h2>
      <div className="host-spots">
        {mySpots.map((s) => {
          const price = s.carPrice ?? s.bikePrice;
          const key = s.carPrice != null ? 'carPrice' : 'bikePrice';
          return (
            <div key={s.id} className={`card host-spot ${s.active ? '' : 'is-paused'}`}>
              <SpotArt spot={s} className="host-spot__art" />
              <div className="host-spot__body">
                <div className="row-between">
                  <div><b>{s.society}</b><small className="muted block">{SPOT_TYPES[s.type].label} · {s.area}</small></div>
                  <label className="switch" title={s.active ? 'Pause bookings' : 'Resume bookings'}>
                    <input type="checkbox" checked={s.active} onChange={() => { editSpot(s.id, { active: !s.active }); showToast(s.active ? 'Bookings paused' : 'Spot is live again'); }} />
                    <span />
                  </label>
                </div>
                <small className="muted">{fmtHours(s.hours)} · {DAYS_LABEL[s.days]}</small>
                <div className="row-between mt-8">
                  <span className={`status ${s.active ? 'status--active' : 'status--completed'} status--sm`}>{s.active ? 'Live' : 'Paused'}</span>
                  <div className="price-edit">
                    <button onClick={() => editSpot(s.id, { [key]: Math.max(10, price - 10) })} aria-label="Lower price"><Minus size={15} /></button>
                    <span>{inr(price)}<small>/hr</small></span>
                    <button onClick={() => editSpot(s.id, { [key]: price + 10 })} aria-label="Raise price"><Plus size={15} /></button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {recent.length > 0 && (
        <>
          <h2 className="h2">Recent</h2>
          <div className="card">{recent.map((b) => <BookingLine key={b.id} b={b} spot={spotById(b.spotId)} now={now} />)}</div>
        </>
      )}

      <div className="guarantee mt-16">
        <ShieldCheck size={22} />
        <div><b>Hosts are protected</b><p>Drivers who overstay are charged automatically, and every booking is tied to a verified phone and vehicle number.</p></div>
      </div>
    </div>
  );
}

function BookingLine({ b, spot, now }) {
  const st = bookingStatus(b, now);
  return (
    <div className="bline">
      <span className={`bline__ico ${b.vehicleType}`}>{b.vehicleType === 'bike' ? <Bike size={17} /> : <Car size={17} />}</span>
      <div className="bline__main">
        <b>{b.vehicleNumber} <span className="muted">· {b.guestName}</span></b>
        <small>{fmtDay(b.start)}, {fmtTime(b.start)}–{fmtTime(endOf(b.start, b.hours + (b.extraHours || 0)))} · {spot?.society}</small>
      </div>
      <div className="bline__amt">
        <b>{inr(b.amount + (b.extraAmount || 0))}</b>
        <small className={`st-${st}`}>{st === 'active' ? 'Parked now' : st === 'upcoming' ? hrsLabel(b.hours + (b.extraHours || 0)) : 'Paid'}</small>
      </div>
    </div>
  );
}
