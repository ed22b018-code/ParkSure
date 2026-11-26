import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, MapPin, Clock, Car, Bike, Info, Map as MapIcon, List } from 'lucide-react';
import { useStore } from '../lib/store.jsx';
import { fromQuery, toQuery, searchSpots, saveLastSearch } from '../lib/search.js';
import { fmtDay, fmtTime, endOf, SIZES, sizeWord } from '../lib/utils.js';
import { ResultsMap } from '../components/MapView.jsx';
import { SpotCard, PlaceSearch, WhenPicker, VehiclePicker } from '../components/ui.jsx';

export default function Results() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { spots, bookings, state, setVehicle } = useStore();
  const { place, start, hours } = fromQuery(sp);
  const v = state.vehicle;
  const [sort, setSort] = useState('near');
  const [covered, setCovered] = useState(false);
  const [ev, setEv] = useState(false);
  const [sel, setSel] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [mobileView, setMobileView] = useState('list');
  const listRef = useRef(null);

  useEffect(() => { if (!place) nav('/', { replace: true }); }, [place, nav]);

  const { items, notFit } = useMemo(
    () => (place ? searchSpots({ spots, bookings, place, start, hours, vehicle: v }) : { items: [], notFit: 0 }),
    [spots, bookings, place, start.getTime(), hours, v.type, v.size], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const shown = useMemo(() => {
    let out = items.filter((i) => (!covered || i.spot.amenities.includes('covered')) && (!ev || i.spot.amenities.includes('ev')));
    out = [...out].sort((a, b) => {
      if (!!a.reason !== !!b.reason) return a.reason ? 1 : -1;
      return sort === 'near' ? a.dist - b.dist : a.rate - b.rate || a.dist - b.dist;
    });
    return out;
  }, [items, sort, covered, ev]);

  const available = shown.filter((i) => !i.reason);

  const update = (patch) => {
    const s = { place, start, hours, ...patch };
    saveLastSearch(s);
    nav(`/search?${toQuery(s)}`, { replace: true });
  };

  const selectFromMap = (id) => {
    setSel(id);
    setMobileView('list');
    setTimeout(() => {
      const el = listRef.current?.querySelector(`[data-spot="${id}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  };

  const open = (id) => nav(`/spot/${id}?${toQuery({ place, start, hours })}`);

  if (!place) return null;
  return (
    <div className="results">
      <div className="results__bar">
        <button className="icon-btn icon-btn--soft" onClick={() => nav('/')} aria-label="Back"><ChevronLeft size={22} /></button>
        <div className="summary">
          <button className="summary__dest" onClick={() => setSheet('place')}><MapPin size={15} /> <b>{place.name}</b></button>
          <div className="summary__row">
            <button onClick={() => setSheet('when')}><Clock size={13} /> {fmtDay(start)}, {fmtTime(start)}–{fmtTime(endOf(start, hours))}</button>
            <button onClick={() => setSheet('vehicle')}>{v.type === 'bike' ? <Bike size={13} /> : <Car size={13} />} {v.type === 'bike' ? 'Bike' : SIZES[v.size].label}</button>
          </div>
        </div>
      </div>

      <div className="results__layout">
        <aside className={`results__list ${mobileView === 'map' ? 'is-hidden-m' : ''}`} ref={listRef}>
          <div className="filters">
            <div className="seg seg--sm">
              <button className={sort === 'near' ? 'is-on' : ''} onClick={() => setSort('near')}>Nearest</button>
              <button className={sort === 'cheap' ? 'is-on' : ''} onClick={() => setSort('cheap')}>Cheapest</button>
            </div>
            <button className={`chip chip--sm ${covered ? 'is-on' : ''}`} onClick={() => setCovered(!covered)}>Covered</button>
            {v.type === 'car' && <button className={`chip chip--sm ${ev ? 'is-on' : ''}`} onClick={() => setEv(!ev)}>EV charging</button>}
          </div>

          <div className="results__count">
            {available.length ? (
              <><b>{available.length} spot{available.length > 1 ? 's' : ''}</b> free for your time · closest is a {Math.min(...available.map((i) => i.walk))} min walk</>
            ) : <b>No free spots for this time</b>}
          </div>
          {notFit > 0 && v.type === 'car' && (
            <p className="note"><Info size={15} /> {notFit} more spot{notFit > 1 ? 's are' : ' is'} nearby but too small for {v.size === 'suv' ? 'an' : 'a'} {sizeWord(v.size)}.</p>
          )}

          {shown.map((item) => (
            <SpotCard key={item.spot.id} item={item} hours={hours} selected={sel === item.spot.id}
              onHover={() => setSel(item.spot.id)} onClick={() => open(item.spot.id)} />
          ))}

          {!available.length && (
            <div className="empty">
              <b>Try a different time or a shorter stay</b>
              <p>Spots near {place.name} are booked up. Earlier slots usually have more space.</p>
              <div className="chips">
                <button className="chip" onClick={() => update({ hours: Math.max(1, hours - 1) })}>Shorter stay</button>
                <button className="chip" onClick={() => setSheet('when')}>Change time</button>
                {v.type === 'car' && v.size !== 'hatchback' && <button className="chip" onClick={() => setSheet('vehicle')}>Change vehicle</button>}
              </div>
            </div>
          )}
          <div className="results__foot muted small">Prices are set by hosts. You pay only for the hours you book.</div>
        </aside>

        <div className={`results__map ${mobileView === 'map' ? 'is-shown-m' : ''}`}>
          <ResultsMap destination={place} items={shown} selectedId={sel} onSelect={selectFromMap} />
        </div>
      </div>

      <button className="map-toggle" onClick={() => setMobileView(mobileView === 'map' ? 'list' : 'map')}>
        {mobileView === 'map' ? <><List size={16} /> List</> : <><MapIcon size={16} /> Map</>}
      </button>

      <PlaceSearch open={sheet === 'place'} onClose={() => setSheet(null)} onPick={(p) => { setSheet(null); update({ place: p }); }} />
      <WhenPicker open={sheet === 'when'} start={start} hours={hours} onClose={() => setSheet(null)} onDone={(s, h) => { setSheet(null); update({ start: s, hours: h }); }} />
      <VehiclePicker open={sheet === 'vehicle'} vehicle={v} onClose={() => setSheet(null)} onDone={(nv) => { setVehicle(nv); setSheet(null); }} />
    </div>
  );
}
