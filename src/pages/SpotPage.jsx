import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Star, Footprints, ShieldCheck, Check, Ruler, Clock, Calendar, Building2, Lock, Car, Bike, TriangleAlert, ChevronRight } from 'lucide-react';
import { useStore } from '../lib/store.jsx';
import { fromQuery, toQuery } from '../lib/search.js';
import { SIZES, SPOT_TYPES, AMENITIES, ACCESS, DAYS_LABEL, fmtHours, fits, rateFor, unavailableReason, haversine, walkMins, inr, hrsLabel, fmtDay, fmtTime, endOf, PLATFORM_FEE, sizeWord } from '../lib/utils.js';
import SpotArt from '../components/SpotArt.jsx';
import { ApproxMap } from '../components/MapView.jsx';
import { WhenPicker, VehiclePicker } from '../components/ui.jsx';

export default function SpotPage() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { getSpot, bookings, state, setVehicle } = useStore();
  const spot = getSpot(id);
  const q = fromQuery(sp);
  const [start, setStart] = useState(q.start);
  const [hours, setHours] = useState(q.hours);
  const [sheet, setSheet] = useState(null);
  const v = state.vehicle;

  if (!spot) return <div className="page pad"><h2>Spot not found</h2><button className="btn" onClick={() => nav('/')}>Back home</button></div>;

  const fitsVehicle = fits(spot, v);
  const supportsType = spot.vehicles.includes(v.type);
  const rate = rateFor(spot, supportsType ? v.type : spot.vehicles[0]);
  const reason = unavailableReason(spot, start, hours, bookings);
  const total = rate * hours + PLATFORM_FEE;
  const walk = q.place ? walkMins(haversine(q.place, spot)) : null;
  const canBook = fitsVehicle && !reason;

  const book = () => nav(`/checkout/${spot.id}?${toQuery({ place: q.place || { id: 'custom', name: spot.landmark, lat: spot.lat, lng: spot.lng }, start, hours })}`);

  const fitLine = v.type === 'bike'
    ? (spot.vehicles.includes('bike') ? 'Your bike fits here' : 'This spot is for cars only')
    : !spot.vehicles.includes('car') ? 'This spot is for bikes only'
      : fitsVehicle ? `Your ${sizeWord(v.size)} fits here` : `Too small for ${v.size === 'suv' ? 'an' : 'a'} ${sizeWord(v.size)} — fits up to ${sizeWord(spot.maxSize)}`;

  const panel = (
    <div className="book-panel">
      <div className="book-panel__price"><b>{inr(rate)}</b> / hour{spot.vehicles.length > 1 && <span className="muted small"> · {v.type === 'bike' ? `car ${inr(spot.carPrice)}/hr` : `bike ${inr(spot.bikePrice)}/hr`}</span>}</div>
      <button className="pick-row" onClick={() => setSheet('when')}>
        <Clock size={18} /><span><small>When</small><b>{fmtDay(start)}, {fmtTime(start)} – {fmtTime(endOf(start, hours))}</b></span><ChevronRight size={18} className="muted" />
      </button>
      <button className="pick-row" onClick={() => setSheet('vehicle')}>
        {v.type === 'bike' ? <Bike size={18} /> : <Car size={18} />}<span><small>Vehicle</small><b>{v.type === 'bike' ? 'Bike / scooter' : `Car · ${SIZES[v.size].label}`}{v.number ? ` · ${v.number}` : ''}</b></span><ChevronRight size={18} className="muted" />
      </button>
      {reason && <p className="note note--warn"><TriangleAlert size={15} /> {reason}. Try another time.</p>}
      {!fitsVehicle && <p className="note note--warn"><TriangleAlert size={15} /> {fitLine}.</p>}
      <div className="breakdown">
        <div><span>{inr(rate)} × {hrsLabel(hours)}</span><span>{inr(rate * hours)}</span></div>
        <div><span>Platform fee</span><span>{inr(PLATFORM_FEE)}</span></div>
        <div className="breakdown__total"><span>Total</span><span>{inr(total)}</span></div>
      </div>
      <button className="btn btn--primary btn--block btn--lg" disabled={!canBook} onClick={book}>Book this spot</button>
      <p className="muted small center">Free cancellation until your start time</p>
    </div>
  );

  return (
    <div className="spot-page">
      <div className="spot-page__hero">
        <SpotArt spot={spot} />
        <button className="icon-btn icon-btn--float" onClick={() => nav(-1)} aria-label="Back"><ChevronLeft size={22} /></button>
      </div>

      <div className="spot-page__grid">
        <div className="spot-page__main">
          <span className="eyebrow eyebrow--plain">{SPOT_TYPES[spot.type].label} parking · {spot.area}</span>
          <h1 className="spot-page__title">{spot.society}</h1>
          <div className="spot-page__meta">
            <span className="rating"><Star size={15} fill="currentColor" /> {spot.rating} <span className="muted">({spot.reviews} reviews)</span></span>
            <span className="dot" />
            <span>{spot.landmark}</span>
          </div>
          {walk && <div className="walk-pill"><Footprints size={16} /> {walk} min walk to {q.place.name}</div>}

          <div className="m-only m-picks">
            <button className="pick-row" onClick={() => setSheet('when')}>
              <Clock size={18} /><span><small>When</small><b>{fmtDay(start)}, {fmtTime(start)} – {fmtTime(endOf(start, hours))}</b></span><ChevronRight size={18} className="muted" />
            </button>
            <button className="pick-row" onClick={() => setSheet('vehicle')}>
              {v.type === 'bike' ? <Bike size={18} /> : <Car size={18} />}<span><small>Vehicle</small><b>{v.type === 'bike' ? 'Bike / scooter' : `Car · ${SIZES[v.size].label}`}</b></span><ChevronRight size={18} className="muted" />
            </button>
            {reason && <p className="note note--warn"><TriangleAlert size={15} /> {reason}. Try another time.</p>}
          </div>

          <div className={`fit-box ${fitsVehicle ? '' : 'fit-box--no'}`}>
            <span className="fit-box__ico">{fitsVehicle ? <Check size={18} /> : <TriangleAlert size={18} />}</span>
            <div>
              <b>{fitLine}</b>
              <small>
                {spot.vehicles.includes('car') ? `Fits up to ${SIZES[spot.maxSize].label} · ${spot.dims.l} m × ${spot.dims.w} m` : 'Two-wheelers only'}
                {spot.dims.h ? ` · ${spot.dims.h} m height clearance` : ''}
              </small>
            </div>
          </div>

          <div className="facts">
            <div><Clock size={18} /><span><small>Hours</small>{fmtHours(spot.hours)}</span></div>
            <div><Calendar size={18} /><span><small>Days</small>{DAYS_LABEL[spot.days]}</span></div>
            <div><Ruler size={18} /><span><small>Type</small>{SPOT_TYPES[spot.type].desc}</span></div>
            <div><Building2 size={18} /><span><small>Property</small>{ACCESS[spot.access].label}</span></div>
          </div>

          {spot.amenities.length > 0 && (
            <div className="amen">
              {spot.amenities.map((a) => <span key={a} className="amen__item"><Check size={15} /> {AMENITIES[a]}</span>)}
            </div>
          )}

          <div className="guarantee">
            <ShieldCheck size={22} />
            <div><b>ParkSure guarantee</b><p>If the spot is taken when you arrive, you get a 100% refund and we find you the next free spot nearby.</p></div>
          </div>

          <div className="host-row">
            <span className="avatar">{spot.hostName.split(' ').map((x) => x[0]).join('')}</span>
            <div><b>Hosted by {spot.hostName.split(' ')[0]}</b><small>Host since {spot.hostSince} · {ACCESS[spot.access].badge}</small></div>
          </div>

          <h3 className="h3">Location</h3>
          <ApproxMap spot={spot} className="map--approx" />
          <p className="note"><Lock size={15} /> Exact address, gate instructions and host contact unlock right after you book.</p>

          <div className="desk-only">{/* spacer */}</div>
        </div>
        <div className="spot-page__side">{panel}</div>
      </div>

      <div className="bottom-cta">
        <div><b>{inr(total)}</b><small>{hrsLabel(hours)} · {fmtTime(start)}–{fmtTime(endOf(start, hours))}</small></div>
        <button className="btn btn--primary btn--lg" disabled={!canBook} onClick={book}>{reason ? 'Not available' : !fitsVehicle ? "Doesn't fit" : 'Book now'}</button>
      </div>

      <WhenPicker open={sheet === 'when'} start={start} hours={hours} onClose={() => setSheet(null)} onDone={(s, h) => { setStart(s); setHours(h); setSheet(null); }} />
      <VehiclePicker open={sheet === 'vehicle'} vehicle={v} onClose={() => setSheet(null)} onDone={(nv) => { setVehicle(nv); setSheet(null); }} />
    </div>
  );
}
