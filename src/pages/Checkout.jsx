import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ShieldCheck, Clock, Lock, Check, TriangleAlert, Car, Bike, Smartphone, Timer, BadgeCheck } from 'lucide-react';
import { useStore } from '../lib/store.jsx';
import { fromQuery } from '../lib/search.js';
import { SIZES, SPOT_TYPES, rateFor, unavailableReason, inr, hrsLabel, fmtDay, fmtTime, endOf, PLATFORM_FEE, normalisePlate, plateValid, formatPlate, makeCode, uid, GRACE_MIN, overstayPer30, maskPhone } from '../lib/utils.js';
import StoryBanner from '../components/StoryBanner.jsx';
import SpotArt from '../components/SpotArt.jsx';
import { WhenPicker } from '../components/ui.jsx';

const METHODS = [
  { id: 'gpay', name: 'Google Pay', color: '#4285F4', letter: 'G' },
  { id: 'phonepe', name: 'PhonePe', color: '#5F259F', letter: 'Pe' },
  { id: 'paytm', name: 'Paytm', color: '#00BAF2', letter: 'P' },
  { id: 'upi', name: 'Other UPI ID', color: '#2B2622', letter: '@' },
];

export default function Checkout() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { getSpot, bookings, state, setVehicle, addBooking, showToast, setPhone, story } = useStore();
  const spot = getSpot(id);
  const q = fromQuery(sp);
  const [start, setStart] = useState(q.start);
  const [hours, setHours] = useState(q.hours);
  const [plate, setPlate] = useState(state.vehicle.number || (story ? 'MH 02 AB 1234' : ''));
  const [phoneIn, setPhoneIn] = useState('');
  const [otpStage, setOtpStage] = useState(state.phone ? 'verified' : 'idle'); // idle | sent | verified
  const [otp, setOtp] = useState('');
  const [editPhone, setEditPhone] = useState(false);
  const phoneDigits = phoneIn.replace(/\D/g, '').slice(-10);
  const phoneOk = /^[6-9]\d{9}$/.test(phoneDigits);
  const verified = otpStage === 'verified' && !editPhone;
  useEffect(() => {
    if (otpStage !== 'sent') return undefined;
    let i = 0; const code = '4821';
    const t = setInterval(() => {
      i += 1; setOtp(code.slice(0, i));
      if (i >= 4) { clearInterval(t); setTimeout(() => { setOtpStage('verified'); setEditPhone(false); setPhone(phoneDigits); }, 450); }
    }, 260);
    return () => clearInterval(t);
  }, [otpStage]); // eslint-disable-line react-hooks/exhaustive-deps
  const sendOtp = () => { if (!phoneOk) { setTouched(true); return; } setOtp(''); setOtpStage('sent'); };
  const [touched, setTouched] = useState(false);
  const [method, setMethod] = useState('gpay');
  const [upiId, setUpiId] = useState('');
  const [sheet, setSheet] = useState(null);
  const [paying, setPaying] = useState(false);
  const v = state.vehicle;

  if (!spot) return <div className="page pad"><h2>Spot not found</h2></div>;
  const type = spot.vehicles.includes(v.type) ? v.type : spot.vehicles[0];
  const rate = rateFor(spot, type);
  const reason = unavailableReason(spot, start, hours, bookings);
  const subtotal = rate * hours;
  const total = subtotal + PLATFORM_FEE;
  const plateOk = plateValid(plate);
  const upiOk = method !== 'upi' || /^[\w.-]{2,}@[a-z]{2,}$/i.test(upiId.trim());

  const pay = () => {
    setTouched(true);
    if (!verified) { document.getElementById('phone-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    if (!plateOk || !upiOk || reason) return;
    setPaying(true);
    setVehicle({ number: formatPlate(plate) });
    setTimeout(() => {
      const booking = {
        id: 'bk-' + uid(),
        code: makeCode(),
        spotId: spot.id,
        guestId: state.deviceId,
        guestName: 'You',
        guestPhone: state.phone || phoneDigits,
        reminder: true,
        vehicleType: type,
        vehicleSize: type === 'car' ? v.size : null,
        vehicleNumber: formatPlate(plate),
        start: new Date(start).toISOString(),
        hours,
        extraHours: 0,
        rate,
        amount: subtotal,
        fee: PLATFORM_FEE,
        method,
        destination: q.place ? { name: q.place.name, lat: q.place.lat, lng: q.place.lng } : null,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      };
      addBooking(booking);
      showToast('Payment successful · Spot booked');
      nav(`/booking/${booking.id}?new=1`, { replace: true });
    }, 1700);
  };

  return (
    <div className="page checkout">
      <div className="page-bar">
        <button className="icon-btn icon-btn--soft" onClick={() => nav(-1)} aria-label="Back"><ChevronLeft size={22} /></button>
        <h2>Confirm & pay</h2>
      </div>

      <StoryBanner step={3} title="Verify your number and pay">The OTP fills itself in this demo, and no real money is charged.</StoryBanner>

      <div className="checkout__grid">
        <div className="checkout__main">
          <div className="card mini-spot">
            <SpotArt spot={spot} className="mini-spot__art" />
            <div>
              <b>{spot.society}</b>
              <small>{SPOT_TYPES[spot.type].label} · {spot.landmark}</small>
            </div>
          </div>

          <div className="card" id="phone-card">
            <h3 className="card__title"><Smartphone size={17} /> Your mobile number</h3>
            {verified ? (
              <div className="verified-row">
                <BadgeCheck size={20} />
                <span><b>{maskPhone(state.phone)}</b><small>Verified · the host and security see only a masked number</small></span>
                <button className="link" onClick={() => { setEditPhone(true); setOtpStage('idle'); setPhoneIn(''); }}>Change</button>
              </div>
            ) : (
              <>
                <p className="muted small">One-time check so hosts know every booking is real. We never share your number.</p>
                <div className="phone-row">
                  <span className="phone-row__cc">+91</span>
                  <input className={`input ${touched && !phoneOk && otpStage === 'idle' ? 'is-err' : ''}`} inputMode="numeric" placeholder="98765 43210" value={phoneIn}
                    onChange={(e) => { setPhoneIn(e.target.value.replace(/[^\d ]/g, '').slice(0, 11)); if (otpStage === 'sent') setOtpStage('idle'); }} disabled={otpStage === 'sent'} />
                  <button className="btn btn--dark" onClick={sendOtp} disabled={otpStage === 'sent'}>{otpStage === 'sent' ? 'Sent' : 'Get OTP'}</button>
                </div>
                {otpStage === 'sent' && (
                  <div className="otp">
                    <div className="otp__boxes">{[0, 1, 2, 3].map((k) => <span key={k} className={otp[k] ? 'is-on' : ''}>{otp[k] || ''}</span>)}</div>
                    <small className="muted">Demo: the OTP fills in automatically</small>
                  </div>
                )}
                {touched && !phoneOk && otpStage === 'idle' && <small className="err">Enter a 10-digit mobile number</small>}
              </>
            )}
          </div>

          <div className="card">
            <h3 className="card__title">Your booking</h3>
            <button className="pick-row" onClick={() => setSheet('when')}>
              <Clock size={18} /><span><small>{fmtDay(start)} · {hrsLabel(hours)}</small><b>{fmtTime(start)} – {fmtTime(endOf(start, hours))}</b></span><span className="link">Change</span>
            </button>
            {reason && <p className="note note--warn"><TriangleAlert size={15} /> {reason}. Pick another time.</p>}
            <div className="field">
              <label className="field-label" htmlFor="plate2">
                {type === 'bike' ? <Bike size={15} /> : <Car size={15} />} {type === 'bike' ? 'Bike' : `${SIZES[v.size].label}`} number
              </label>
              <input id="plate2" className={`input input--plate ${touched && !plateOk ? 'is-err' : ''}`} placeholder="MH 02 AB 1234" value={plate}
                onChange={(e) => setPlate(normalisePlate(e.target.value))} onBlur={() => setTouched(true)} inputMode="text" autoComplete="off" />
              {touched && !plateOk
                ? <small className="err">Enter a valid number like MH 02 AB 1234</small>
                : <small className="muted">Shared with security so they let you in</small>}
            </div>
          </div>

          <div className="card">
            <h3 className="card__title">Pay with</h3>
            <div className="pay-list">
              {METHODS.map((m) => (
                <button key={m.id} className={`pay-opt ${method === m.id ? 'is-on' : ''}`} onClick={() => setMethod(m.id)}>
                  <span className="pay-opt__logo" style={{ background: m.color }}>{m.letter}</span>
                  <span>{m.name}</span>
                  <span className="radio" />
                </button>
              ))}
            </div>
            {method === 'upi' && (
              <input className={`input mt-12 ${touched && !upiOk ? 'is-err' : ''}`} placeholder="yourname@okaxis" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
            )}
          </div>
        </div>

        <div className="checkout__side">
          <div className="card">
            <h3 className="card__title">Price details</h3>
            <div className="breakdown">
              <div><span>{inr(rate)} × {hrsLabel(hours)}</span><span>{inr(subtotal)}</span></div>
              <div><span>Platform fee</span><span>{inr(PLATFORM_FEE)}</span></div>
              <div className="breakdown__total"><span>Total</span><span>{inr(total)}</span></div>
            </div>
            <ul className="assure">
              <li><ShieldCheck size={16} /> Spot guaranteed, or a full refund</li>
              <li><Check size={16} /> Free cancellation until {fmtTime(start)}</li>
              <li><Lock size={16} /> Exact address unlocks after payment</li>
              <li><Timer size={16} /> {GRACE_MIN} min grace after {fmtTime(endOf(start, hours))}, then {inr(overstayPer30(rate))} per extra 30 min</li>
            </ul>
            <button className="btn btn--primary btn--block btn--lg desk-only" disabled={!!reason || !verified} onClick={pay}>Pay {inr(total)}</button>
            {!verified && <p className="muted small center mt-8 desk-only">Verify your mobile number to pay</p>}
          </div>
        </div>
      </div>

      <div className="bottom-cta">
        <div><b>{inr(total)}</b><small>{verified ? `incl. ₹${PLATFORM_FEE} fee` : 'Verify your number first'}</small></div>
        <button className="btn btn--primary btn--lg" disabled={!!reason || !verified} onClick={pay}>Pay {inr(total)}</button>
      </div>

      {paying && (
        <div className="paying">
          <div className="paying__box">
            <span className="spinner" />
            <b>Waiting for {METHODS.find((m) => m.id === method).name}…</b>
            <small>Approve {inr(total)} in your UPI app</small>
            <small className="muted">Demo: no real money is charged</small>
          </div>
        </div>
      )}

      <WhenPicker open={sheet === 'when'} start={start} hours={hours} onClose={() => setSheet(null)} onDone={(s, h) => { setStart(s); setHours(h); setSheet(null); }} />
    </div>
  );
}
