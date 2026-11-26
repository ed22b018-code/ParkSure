import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, Clock, Car, Bike, ShieldCheck, Ticket, IndianRupee, ArrowRight, ChevronRight, Footprints } from 'lucide-react';
import { useStore } from '../lib/store.jsx';
import { PLACES, CATEGORIES } from '../data/places.js';
import { fmtDay, fmtTime, endOf, hrsLabel, nextSlot, bookingStatus, durationText, SIZES, spotTitle } from '../lib/utils.js';
import { toQuery, lastSearch, saveLastSearch } from '../lib/search.js';
import { PlaceSearch, WhenPicker, VehiclePicker } from '../components/ui.jsx';
import SpotArt from '../components/SpotArt.jsx';
import { SEED_SPOTS } from '../data/seed.js';

const POPULAR = ['mithibai', 'lilavati', 'palladium', 'shivaji', 'jio', 'linking', 'kokilaben', 'siddhivinayak'];

export default function Home() {
  const nav = useNavigate();
  const { state, setVehicle, myBookings, now, getSpot } = useStore();
  const last = lastSearch();
  const [place, setPlace] = useState(last?.place || null);
  const [start, setStart] = useState(last?.start || nextSlot());
  const [hours, setHours] = useState(last?.hours || 2);
  const [sheet, setSheet] = useState(null);
  const v = state.vehicle;

  const go = (p = place) => {
    if (!p) { setSheet('place'); return; }
    const s = { place: p, start, hours };
    saveLastSearch(s);
    nav(`/search?${toQuery(s)}`);
  };

  const live = myBookings
    .map((b) => ({ b, st: bookingStatus(b, now), spot: getSpot(b.spotId) }))
    .filter((x) => x.spot && (x.st === 'upcoming' || x.st === 'active'))
    .sort((a, b) => new Date(a.b.start) - new Date(b.b.start))[0];

  return (
    <div className="home">
      <section className="hero">
        <div className="hero__copy">
          <span className="eyebrow"><ShieldCheck size={15} /> Guaranteed spots from verified residents</span>
          <h1>Parking, sorted<br />before you leave.</h1>
          <p className="lead">Book a spot in someone's society or driveway — a short walk from your exam centre, hospital or shop. No circling, no fines.</p>

          <div className="search-card">
            <button className="search-card__dest" onClick={() => setSheet('place')}>
              <MapPin size={20} className="green" />
              <span className={place ? '' : 'placeholder'}>{place ? place.name : 'Where are you going?'}</span>
              {place && <small>{place.area}</small>}
            </button>
            <div className="search-card__row">
              <button className="search-card__chip" onClick={() => setSheet('when')}>
                <Clock size={17} />
                <span><small>{fmtDay(start)}</small>{fmtTime(start)} · {hrsLabel(hours)}</span>
              </button>
              <button className="search-card__chip" onClick={() => setSheet('vehicle')}>
                {v.type === 'bike' ? <Bike size={18} /> : <Car size={18} />}
                <span><small>{v.type === 'bike' ? 'Two-wheeler' : 'Car'}</small>{v.type === 'bike' ? 'Bike' : SIZES[v.size].label}</span>
              </button>
            </div>
            <button className="btn btn--primary btn--block btn--lg" onClick={() => go()}>Find parking <ArrowRight size={18} /></button>
          </div>
        </div>

        <div className="hero__art" aria-hidden="true">
          <div className="hero__card hero__card--spot">
            <SpotArt spot={SEED_SPOTS[1]} />
            <div className="hero__card-body">
              <b>Stilt · Hill View Apartments</b>
              <span><Footprints size={13} /> 4 min walk to Mithibai College</span>
              <div className="hero__price"><b>₹60</b>/hr <span className="tag tag--green">Fits SUV</span></div>
            </div>
          </div>
          <div className="hero__card hero__card--pass">
            <div className="mini-qr" />
            <div><small>Gate pass</small><b>PS-7K4QM</b><span>MH 02 AB 1234</span></div>
          </div>
          <div className="hero__card hero__card--guarantee"><ShieldCheck size={18} /> Spot guaranteed or 100% refund</div>
        </div>
      </section>

      {live && (
        <Link to={`/booking/${live.b.id}`} className="live-card">
          <span className={`live-card__pulse ${live.st}`} />
          <div className="live-card__text">
            <small>{live.st === 'active' ? `Parked · ${durationText(endOf(live.b.start, live.b.hours + (live.b.extraHours || 0)) - now)} left` : `Starts in ${durationText(new Date(live.b.start) - now)}`}</small>
            <b>{spotTitle(live.spot)}</b>
          </div>
          <span className="live-card__cta">Gate pass <ChevronRight size={16} /></span>
        </Link>
      )}

      <section className="section">
        <div className="section__head"><h2>Popular right now</h2><span className="muted small">Tap to see spots nearby</span></div>
        <div className="place-cards">
          {POPULAR.map((id) => PLACES.find((p) => p.id === id)).map((p) => (
            <button key={p.id} className="place-card" onClick={() => { setPlace(p); go(p); }}>
              <span className="place-card__emoji">{CATEGORIES[p.cat].emoji}</span>
              <b>{p.name}</b>
              <small>{CATEGORIES[p.cat].label} · {p.area}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="section how">
        <h2>How it works</h2>
        <div className="how__grid">
          <div className="how__item"><span className="how__n">1</span><b>Tell us where you're going</b><p>We show spots within a short walk that fit your car or bike.</p></div>
          <div className="how__item"><span className="how__n">2</span><b>Book in two taps</b><p>Pay by UPI. The exact address unlocks once you're booked.</p></div>
          <div className="how__item"><span className="how__n">3</span><b>Show your gate pass</b><p>Security scans your pass. If the spot is taken, we refund and rebook you.</p></div>
        </div>
      </section>

      <section className="section trust">
        <div className="trust__item"><ShieldCheck size={22} /><div><b>Spot guaranteed</b><p>Taken when you arrive? Full refund and the next spot nearby.</p></div></div>
        <div className="trust__item"><Ticket size={22} /><div><b>Gate pass, not arguments</b><p>Security already has your vehicle number.</p></div></div>
        <div className="trust__item"><IndianRupee size={22} /><div><b>Cheaper than a fine</b><p>Most spots cost less than a no-parking challan or towing.</p></div></div>
      </section>

      <Link to="/host" className="host-banner">
        <div>
          <small>Have an empty parking spot?</small>
          <b>Earn up to ₹8,000 a month while you're at work.</b>
        </div>
        <span className="btn btn--dark">Rent it out <ArrowRight size={16} /></span>
      </Link>

      <PlaceSearch open={sheet === 'place'} onClose={() => setSheet(null)} onPick={(p) => { setPlace(p); setSheet(null); }} />
      <WhenPicker open={sheet === 'when'} start={start} hours={hours} onClose={() => setSheet(null)} onDone={(s, h) => { setStart(s); setHours(h); setSheet(null); }} />
      <VehiclePicker open={sheet === 'vehicle'} vehicle={v} onClose={() => setSheet(null)} onDone={(nv) => { setVehicle(nv); setSheet(null); }} />
    </div>
  );
}
