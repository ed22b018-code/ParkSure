import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, ChevronRight, Search } from 'lucide-react';
import { useStore } from '../lib/store.jsx';
import { SPOT_TYPES, fmtDay, fmtTime, endOf, bookingStatus, durationText, inr } from '../lib/utils.js';
import SpotArt from '../components/SpotArt.jsx';

const LABEL = { upcoming: 'Upcoming', active: 'Parked now', completed: 'Completed', cancelled: 'Cancelled', refunded: 'Refunded' };

export default function Bookings() {
  const { myBookings, getSpot, now } = useStore();
  const [tab, setTab] = useState('live');
  const rows = myBookings
    .map((b) => ({ b, st: bookingStatus(b, now), spot: getSpot(b.spotId) }))
    .filter((r) => r.spot);
  const live = rows.filter((r) => r.st === 'upcoming' || r.st === 'active').sort((a, c) => new Date(a.b.start) - new Date(c.b.start));
  const past = rows.filter((r) => !(r.st === 'upcoming' || r.st === 'active')).sort((a, c) => new Date(c.b.start) - new Date(a.b.start));
  const list = tab === 'live' ? live : past;

  return (
    <div className="page bookings">
      <div className="page-head">
        <h1>My bookings</h1>
        <div className="seg">
          <button className={tab === 'live' ? 'is-on' : ''} onClick={() => setTab('live')}>Upcoming{live.length ? ` · ${live.length}` : ''}</button>
          <button className={tab === 'past' ? 'is-on' : ''} onClick={() => setTab('past')}>Past</button>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="empty empty--big">
          <span className="empty__ico"><Ticket size={28} /></span>
          <b>{tab === 'live' ? 'No upcoming bookings' : 'Nothing here yet'}</b>
          <p>{tab === 'live' ? 'Going somewhere busy? Book a spot before you leave home.' : 'Your past parking will show up here.'}</p>
          <Link to="/" className="btn btn--primary"><Search size={17} /> Find parking</Link>
        </div>
      ) : (
        <div className="booking-list">
          {list.map(({ b, st, spot }) => (
            <Link key={b.id} to={`/booking/${b.id}`} className="booking-row">
              <SpotArt spot={spot} className="booking-row__art" />
              <div className="booking-row__main">
                <span className={`status status--${st} status--sm`}>
                  {st === 'upcoming' ? `In ${durationText(new Date(b.start) - now)}` : st === 'active' ? `${durationText(endOf(b.start, b.hours + (b.extraHours || 0)) - now)} left` : LABEL[st]}
                </span>
                <b>{spot.society}</b>
                <small>{SPOT_TYPES[spot.type].label} · {fmtDay(b.start)}, {fmtTime(b.start)}–{fmtTime(endOf(b.start, b.hours + (b.extraHours || 0)))}</small>
                <small className="muted">{b.vehicleNumber} · {b.coveredBy ? 'Free (guarantee)' : inr(b.amount + b.fee + (b.extraAmount || 0))}</small>
              </div>
              <ChevronRight size={20} className="muted" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
