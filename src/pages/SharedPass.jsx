import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Navigation, KeyRound, MapPin, ShieldCheck } from 'lucide-react';
import { decodePass, fmtDay, fmtTime, endOf, hrsLabel } from '../lib/utils.js';
import { ExactMap } from '../components/MapView.jsx';

export default function SharedPass() {
  const { token } = useParams();
  const d = decodePass(token || '');
  if (!d) return <div className="page pad"><h2>This pass link is broken</h2><p className="muted">Ask the sender to share it again.</p><Link className="btn btn--primary mt-12" to="/">Open ParkSure</Link></div>;
  const end = endOf(d.s, d.h);
  const spot = { lat: d.la, lng: d.ln };
  const live = new Date() < end;
  return (
    <div className="page pass shared-pass">
      <div className="shared-pass__head">
        <ShieldCheck size={18} /> <span>A ParkSure gate pass was shared with you</span>
      </div>
      <div className="pass__grid">
        <div className="pass__col">
          <div className={`ticket ${live ? '' : 'ticket--dim'}`}>
            <div className="ticket__top">
              <div className={`status ${live ? 'status--active' : 'status--completed'}`}>{live ? 'Valid pass' : 'This booking has ended'}</div>
              <div className="ticket__qr"><QRCodeSVG value={`PARKSURE|${d.c}|${d.v}|${d.s}`} size={168} fgColor="#2B2622" bgColor="transparent" level="M" /></div>
              <div className="ticket__code">{d.c}</div>
              <p className="muted small center">Show this QR to security at the gate</p>
            </div>
            <div className="ticket__cut" />
            <div className="ticket__rows">
              <div><small>Vehicle</small><b className="plate">{d.v}</b></div>
              <div><small>{fmtDay(d.s)}</small><b>{fmtTime(d.s)} – {fmtTime(end)}</b></div>
              <div><small>Spot</small><b>{d.t}</b></div>
              <div><small>Duration</small><b>{hrsLabel(d.h)}</b></div>
            </div>
          </div>
        </div>
        <div className="pass__col">
          <div className="card">
            <h3 className="card__title"><MapPin size={17} /> {d.n}</h3>
            <p className="addr">{d.a}</p>
            <ExactMap spot={spot} className="map--exact" />
            <div className="btn-row">
              <a className="btn btn--primary" href={`https://www.google.com/maps/dir/?api=1&destination=${d.la},${d.ln}`} target="_blank" rel="noreferrer"><Navigation size={17} /> Directions</a>
            </div>
          </div>
          <div className="card">
            <h3 className="card__title"><KeyRound size={17} /> How to get in</h3>
            <p className="instr">“{d.i}”</p>
            <small className="muted">— {d.hn}, the host</small>
          </div>
          <Link to="/" className="host-banner mt-16"><div><small>Parking somewhere busy?</small><b>Book your own guaranteed spot on ParkSure.</b></div><span className="btn btn--dark">Open ParkSure</span></Link>
        </div>
      </div>
    </div>
  );
}
