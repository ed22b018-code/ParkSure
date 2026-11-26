import React, { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { ChevronLeft, Navigation, Phone, Copy, ShieldCheck, Plus, X, TriangleAlert, Check, KeyRound, MapPin, PartyPopper } from 'lucide-react';
import { useStore } from '../lib/store.jsx';
import { searchSpots } from '../lib/search.js';
import { SPOT_TYPES, inr, hrsLabel, fmtDay, fmtTime, endOf, bookingStatus, durationText, mapsLink, unavailableReason, makeCode, uid } from '../lib/utils.js';
import { ExactMap } from '../components/MapView.jsx';
import { Sheet, SpotCard } from '../components/ui.jsx';

export default function Pass() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const store = useStore();
  const { bookings, getSpot, updateBooking, addBooking, showToast, now, spots, state } = store;
  const b = bookings.find((x) => x.id === id);
  const spot = b && getSpot(b.spotId);
  const [sheet, setSheet] = useState(null);
  const isNew = sp.get('new') === '1';

  const alternatives = useMemo(() => {
    if (!b || !spot) return [];
    const place = b.destination || { lat: spot.lat, lng: spot.lng, name: spot.landmark };
    const vehicle = { type: b.vehicleType, size: b.vehicleSize || 'hatchback' };
    const startAt = bookingStatus(b, now) === 'active' ? now : new Date(b.start);
    const remaining = Math.max(1, Math.ceil((endOf(b.start, b.hours + (b.extraHours || 0)) - startAt) / 3600000));
    return searchSpots({ spots, bookings, place, start: startAt, hours: remaining, vehicle }).items
      .filter((i) => i.spot.id !== spot.id && !i.reason)
      .sort((a, c) => a.dist - c.dist)
      .slice(0, 3)
      .map((i) => ({ ...i, startAt, remaining }));
  }, [b, spot, spots, bookings, now]);

  if (!b || !spot) return <div className="page pad"><h2>Booking not found</h2><Link className="btn" to="/bookings">My bookings</Link></div>;

  const st = bookingStatus(b, now);
  const totalHrs = b.hours + (b.extraHours || 0);
  const end = endOf(b.start, totalHrs);
  const progress = st === 'active' ? Math.min(100, ((now - new Date(b.start)) / (end - new Date(b.start))) * 100) : 0;
  const paid = b.amount + b.fee + (b.extraAmount || 0);
  const live = st === 'upcoming' || st === 'active';

  const extendReason = unavailableReason(spot, b.start, totalHrs + 1, bookings, b.id);
  const extend = () => {
    if (extendReason) { showToast('Next hour is already booked by someone else', 'warn'); return; }
    updateBooking(b.id, { extraHours: (b.extraHours || 0) + 1, extraAmount: (b.extraAmount || 0) + b.rate });
    showToast(`Extended till ${fmtTime(endOf(b.start, totalHrs + 1))} · ${inr(b.rate)} paid`);
  };

  const cancel = () => {
    updateBooking(b.id, { status: 'cancelled' });
    setSheet(null);
    showToast(`Cancelled · ${inr(paid)} refunded to your UPI`);
  };

  const rebook = (alt) => {
    updateBooking(b.id, { status: 'refunded' });
    const nb = {
      ...b,
      id: 'bk-' + uid(),
      code: makeCode(),
      spotId: alt.spot.id,
      start: new Date(alt.startAt).toISOString(),
      hours: alt.remaining,
      extraHours: 0,
      extraAmount: 0,
      rate: alt.rate,
      amount: 0,
      fee: 0,
      coveredBy: 'ParkSure guarantee',
      replaces: b.id,
      createdAt: new Date().toISOString(),
    };
    addBooking(nb);
    setSheet(null);
    showToast('Rebooked for free · original payment refunded');
    nav(`/booking/${nb.id}`, { replace: true });
  };

  const copyCode = () => { navigator.clipboard?.writeText(b.code); showToast('Booking code copied'); };

  return (
    <div className="page pass">
      <div className="page-bar">
        <button className="icon-btn icon-btn--soft" onClick={() => nav('/bookings')} aria-label="Back"><ChevronLeft size={22} /></button>
        <h2>{st === 'cancelled' ? 'Cancelled booking' : st === 'refunded' ? 'Refunded booking' : 'Your gate pass'}</h2>
      </div>

      {isNew && live && (
        <div className="success-banner">
          <PartyPopper size={22} />
          <div><b>You're booked!</b><span>Your spot is held for you. Show this pass at the gate.</span></div>
        </div>
      )}
      {b.coveredBy && live && (
        <div className="success-banner success-banner--soft">
          <ShieldCheck size={22} />
          <div><b>Rebooked under the ParkSure guarantee</b><span>This spot is on us. Your original payment is being refunded.</span></div>
        </div>
      )}

      <div className="pass__grid">
        <div className="pass__col">
          <div className={`ticket ${live ? '' : 'ticket--dim'}`}>
            <div className="ticket__top">
              <div className={`status status--${st}`}>
                {st === 'upcoming' && <>Starts in {durationText(new Date(b.start) - now)}</>}
                {st === 'active' && <>Parked · {durationText(end - now)} left</>}
                {st === 'completed' && <>Completed</>}
                {st === 'cancelled' && <>Cancelled · refunded</>}
                {st === 'refunded' && <>Refunded · rebooked elsewhere</>}
              </div>
              {st === 'active' && <div className="progress"><span style={{ width: `${progress}%` }} /></div>}
              <div className="ticket__qr">
                <QRCodeSVG value={`PARKSURE|${b.code}|${b.vehicleNumber}|${spot.id}|${b.start}`} size={168} fgColor="#2B2622" bgColor="transparent" level="M" />
              </div>
              <button className="ticket__code" onClick={copyCode} aria-label="Copy booking code">{b.code} <Copy size={14} /></button>
              <p className="muted small center">Show this QR to security at the gate</p>
            </div>
            <div className="ticket__cut" />
            <div className="ticket__rows">
              <div><small>Vehicle</small><b className="plate">{b.vehicleNumber}</b></div>
              <div><small>{fmtDay(b.start)}</small><b>{fmtTime(b.start)} – {fmtTime(end)}</b></div>
              <div><small>Spot</small><b>{SPOT_TYPES[spot.type].label}</b></div>
              <div><small>Duration</small><b>{hrsLabel(totalHrs)}</b></div>
            </div>
          </div>

          {live && (
            <div className="pass-actions">
              <button className="btn btn--ghost" onClick={extend}><Plus size={17} /> Extend 1 hr · {inr(b.rate)}</button>
              {st === 'upcoming' && <button className="btn btn--ghost" onClick={() => setSheet('cancel')}><X size={17} /> Cancel</button>}
            </div>
          )}
        </div>

        <div className="pass__col">
          <div className="card">
            <h3 className="card__title"><MapPin size={17} /> {spot.society}</h3>
            <p className="addr">{spot.address}</p>
            <ExactMap spot={spot} className="map--exact" />
            <div className="btn-row">
              <a className="btn btn--primary" href={mapsLink(spot)} target="_blank" rel="noreferrer"><Navigation size={17} /> Directions</a>
              <button className="btn btn--ghost" onClick={() => showToast(`Calling ${spot.hostName.split(' ')[0]} via a masked number…`)}><Phone size={17} /> Call host</button>
            </div>
          </div>

          <div className="card">
            <h3 className="card__title"><KeyRound size={17} /> How to get in</h3>
            <p className="instr">“{spot.instructions}”</p>
            <small className="muted">— {spot.hostName.split(' ')[0]}, your host</small>
          </div>

          {live && (
            <button className="problem-btn" onClick={() => setSheet('problem')}>
              <TriangleAlert size={18} />
              <span><b>Spot taken or can't get in?</b><small>We'll refund you and find the next free spot</small></span>
            </button>
          )}

          <div className="card">
            <h3 className="card__title">Payment</h3>
            <div className="breakdown">
              {b.coveredBy ? (
                <div className="breakdown__total"><span>Covered by ParkSure</span><span>{inr(0)}</span></div>
              ) : (
                <>
                  <div><span>{inr(b.rate)} × {hrsLabel(b.hours)}</span><span>{inr(b.amount)}</span></div>
                  {b.extraHours > 0 && <div><span>Extension · {hrsLabel(b.extraHours)}</span><span>{inr(b.extraAmount)}</span></div>}
                  <div><span>Platform fee</span><span>{inr(b.fee)}</span></div>
                  <div className="breakdown__total"><span>{st === 'cancelled' || st === 'refunded' ? 'Refunded' : 'Paid'}</span><span>{inr(paid)}</span></div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <Sheet open={sheet === 'cancel'} onClose={() => setSheet(null)} title="Cancel this booking?"
        footer={<div className="btn-row btn-row--full"><button className="btn btn--ghost" onClick={() => setSheet(null)}>Keep booking</button><button className="btn btn--danger" onClick={cancel}>Cancel & refund</button></div>}>
        <p>You'll get <b>{inr(paid)}</b> back to your UPI within a few minutes. Cancellation is free until {fmtTime(b.start)}.</p>
      </Sheet>

      <Sheet open={sheet === 'problem'} onClose={() => setSheet(null)} title="Sorry about that — we've got you">
        <div className="guarantee guarantee--tight">
          <ShieldCheck size={22} />
          <div><b>Your {inr(paid)} will be refunded in full</b><p>Pick one of these free spots nearby — it's on us. We'll also follow up with the host.</p></div>
        </div>
        {alternatives.length ? alternatives.map((alt) => (
          <div key={alt.spot.id} className="alt">
            <SpotCard item={alt} hours={alt.remaining} compact onClick={() => rebook(alt)} />
            <button className="btn btn--primary btn--sm" onClick={() => rebook(alt)}><Check size={15} /> Book free</button>
          </div>
        )) : <p className="muted">No other free spots nearby right now. Your refund is on its way and our team will call you.</p>}
        <button className="btn btn--link btn--block" onClick={() => { updateBooking(b.id, { status: 'refunded' }); setSheet(null); showToast(`${inr(paid)} refunded to your UPI`); }}>Just refund me</button>
      </Sheet>
    </div>
  );
}
