import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

const TILE = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const destIcon = L.divIcon({
  className: 'pin-wrap',
  html: '<div class="dest-pin"><span></span></div>',
  iconSize: [30, 40],
  iconAnchor: [15, 38],
});

function priceIcon(label, selected, muted) {
  return L.divIcon({
    className: 'pin-wrap',
    html: `<div class="price-pin${selected ? ' is-sel' : ''}${muted ? ' is-muted' : ''}">${label}</div>`,
    iconSize: [60, 30],
    iconAnchor: [30, 30],
  });
}

function FitBounds({ points, padding = 40, maxZoom = 16 }) {
  const map = useMap();
  const key = points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join('|');
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) { map.setView([points[0].lat, points[0].lng], 16); return; }
    map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [padding, padding], maxZoom });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

function PanTo({ point }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.panTo([point.lat, point.lng], { animate: true });
  }, [point, map]);
  return null;
}

export function ResultsMap({ destination, items, selectedId, onSelect, className = '' }) {
  const points = useMemo(() => [destination, ...items.slice(0, 8).map((i) => i.spot)], [destination, items]);
  const selected = items.find((i) => i.spot.id === selectedId);
  return (
    <MapContainer className={`map ${className}`} center={[destination.lat, destination.lng]} zoom={15} zoomControl={false} scrollWheelZoom>
      <TileLayer url={TILE} attribution={ATTR} />
      <FitBounds points={points} />
      <PanTo point={selected ? selected.spot : null} />
      <Marker position={[destination.lat, destination.lng]} icon={destIcon} zIndexOffset={1000} />
      {items.map(({ spot, rate, reason }) => (
        <Marker
          key={spot.id}
          position={[spot.lat, spot.lng]}
          icon={priceIcon(reason ? 'Full' : `₹${rate}`, spot.id === selectedId, !!reason)}
          zIndexOffset={spot.id === selectedId ? 900 : 0}
          eventHandlers={{ click: () => onSelect(spot.id) }}
        />
      ))}
    </MapContainer>
  );
}

// Approximate location only — exact spot is revealed after booking
export function ApproxMap({ spot, className = '' }) {
  return (
    <MapContainer className={`map ${className}`} center={[spot.lat, spot.lng]} zoom={15} zoomControl={false} scrollWheelZoom={false} dragging={false} doubleClickZoom={false} attributionControl>
      <TileLayer url={TILE} attribution={ATTR} />
      <Circle center={[spot.lat + 0.0006, spot.lng - 0.0005]} radius={180} pathOptions={{ color: '#00B386', fillColor: '#00B386', fillOpacity: 0.16, weight: 2 }} />
    </MapContainer>
  );
}

export function ExactMap({ spot, className = '' }) {
  const icon = useMemo(() => priceIcon('P', true, false), []);
  return (
    <MapContainer className={`map ${className}`} center={[spot.lat, spot.lng]} zoom={16} zoomControl={false} scrollWheelZoom={false}>
      <TileLayer url={TILE} attribution={ATTR} />
      <Marker position={[spot.lat, spot.lng]} icon={icon} />
    </MapContainer>
  );
}

function CenterWatcher({ onMove }) {
  const map = useMapEvents({
    moveend: () => { const c = map.getCenter(); onMove({ lat: c.lat, lng: c.lng }); },
  });
  return null;
}

function Recenter({ to }) {
  const map = useMap();
  useEffect(() => { if (to) map.setView([to.lat, to.lng], 17); }, [to, map]);
  useEffect(() => { const t = setTimeout(() => map.invalidateSize(), 200); return () => clearTimeout(t); }, [map]);
  return null;
}

export function PinPicker({ value, jumpTo, onChange, className = '' }) {
  return (
    <div className={`pin-picker ${className}`}>
      <MapContainer className="map" center={[value.lat, value.lng]} zoom={17} zoomControl={false}>
        <TileLayer url={TILE} attribution={ATTR} />
        <CenterWatcher onMove={onChange} />
        <Recenter to={jumpTo} />
      </MapContainer>
      <div className="pin-picker__pin" aria-hidden="true"><div className="price-pin is-sel">P</div><i /></div>
      <div className="pin-picker__hint">Drag the map to place the pin on your gate</div>
    </div>
  );
}
