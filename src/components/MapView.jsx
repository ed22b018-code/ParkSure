import React, { useMemo, useRef } from 'react';
import CityMap from './CityMap.jsx';

const destNode = <div className="dest-pin"><span /></div>;

export function ResultsMap({ destination, items, selectedId, onSelect, className = '' }) {
  const fit = useMemo(() => [destination, ...items.slice(0, 8).map((i) => ({ lat: i.spot.lat, lng: i.spot.lng }))], [destination, items]);
  const selected = items.find((i) => i.spot.id === selectedId);
  const markers = [
    { id: 'dest', lat: destination.lat, lng: destination.lng, z: 50, node: <div className="cm-dest">{destNode}<span className="cm-dest__label">{destination.name}</span></div> },
    ...items.map(({ spot, rate, reason }) => ({
      id: spot.id, lat: spot.lat, lng: spot.lng, z: spot.id === selectedId ? 60 : reason ? 1 : 10,
      onClick: () => onSelect(spot.id),
      node: <div className={`price-pin${spot.id === selectedId ? ' is-sel' : ''}${reason ? ' is-muted' : ''}`}>{reason ? 'Full' : `₹${rate}`}</div>,
    })),
  ];
  return <CityMap className={`map ${className}`} center={destination} fit={fit} markers={markers} focus={selected ? selected.spot : null} />;
}

// Approximate location only — exact spot is revealed after booking
export function ApproxMap({ spot, className = '' }) {
  const c = { lat: spot.lat + 0.0006, lng: spot.lng - 0.0005 };
  return (
    <CityMap className={`map ${className}`} center={c} scale={2} interactive={false}>
      {({ toS, scale }) => { const p = toS(c); const r = 190 / scale; return (
        <svg className="cm-overlay"><circle cx={p.x} cy={p.y} r={r} className="cm-approx" /></svg>
      ); }}
    </CityMap>
  );
}

export function ExactMap({ spot, className = '' }) {
  return (
    <CityMap className={`map ${className}`} center={spot} scale={1.5}
      markers={[{ id: 'p', lat: spot.lat, lng: spot.lng, node: <div className="price-pin is-sel">P</div> }]} />
  );
}

export function PinPicker({ value, jumpTo, onChange, className = '' }) {
  const initial = useRef(value);
  return (
    <div className={`pin-picker ${className}`}>
      <CityMap className="map" center={jumpTo || initial.current} scale={1.4} onMoveEnd={onChange} />
      <div className="pin-picker__pin" aria-hidden="true"><div className="price-pin is-sel">P</div><i /></div>
      <div className="pin-picker__hint">Drag the map to place the pin on your gate</div>
    </div>
  );
}
