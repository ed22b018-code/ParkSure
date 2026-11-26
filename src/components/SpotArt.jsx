import React from 'react';

// Illustrated spot preview, used when a host hasn't uploaded photos
const PALETTES = {
  basement: ['#2F3B37', '#45534E', '#F5A524'],
  stilt: ['#DCEFE6', '#B9E1CF', '#00936E'],
  open: ['#FCEBD3', '#F6D7AE', '#C9761A'],
  garage: ['#EFE7DC', '#DDCFBD', '#6E5B46'],
};

export default function SpotArt({ spot, className = '', label = true }) {
  if (spot.photos && spot.photos.length) {
    return <img className={`spot-art ${className}`} src={spot.photos[0]} alt={`Photo of ${spot.society}`} />;
  }
  const [bg, mid, accent] = PALETTES[spot.type] || PALETTES.open;
  const dark = spot.type === 'basement';
  const line = dark ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.95)';
  const hash = [...spot.id].reduce((a, c) => a + c.charCodeAt(0), 0);
  const carX = 40 + (hash % 3) * 70;
  return (
    <svg className={`spot-art ${className}`} viewBox="0 0 320 200" preserveAspectRatio="xMidYMax slice" role="img" aria-label={`${spot.type} parking illustration`}>
      <rect width="320" height="200" fill={bg} />
      {spot.type === 'basement' && (
        <>
          <rect x="0" y="0" width="320" height="34" fill="#25302C" />
          {[50, 150, 250].map((x) => <rect key={x} x={x} y="12" width="44" height="6" rx="3" fill="#FFE7A8" opacity=".9" />)}
          <rect x="138" y="34" width="16" height="70" fill="#3A4843" />
        </>
      )}
      {spot.type === 'stilt' && (
        <>
          <rect x="0" y="0" width="320" height="40" fill="#E9F6EF" />
          {[20, 120, 220, 300].map((x) => <rect key={x} x={x} y="40" width="14" height="70" fill="#A6D6C0" />)}
        </>
      )}
      {spot.type === 'open' && (
        <>
          <circle cx="270" cy="38" r="20" fill="#F9C46B" />
          <path d="M0 70 Q60 40 120 66 T240 60 T320 58 V0 H0Z" fill="#FBE3C2" />
          <circle cx="40" cy="78" r="18" fill="#9FCB8C" /><rect x="37" y="86" width="6" height="22" fill="#8A6A4A" />
        </>
      )}
      {spot.type === 'garage' && (
        <>
          <path d="M20 70 L160 22 L300 70 Z" fill="#CDBBA3" />
          {[0, 1, 2, 3].map((i) => <rect key={i} x="60" y={78 + i * 9} width="200" height="5" fill="#C8B79F" />)}
        </>
      )}
      <rect x="0" y="110" width="320" height="90" fill={mid} />
      {[20, 110, 200, 290].map((x) => <rect key={x} x={x} y="118" width="5" height="76" fill={line} />)}
      <rect x="0" y="192" width="320" height="4" fill={line} />
      <g transform={`translate(${carX} 136)`}>
        <rect x="0" y="12" width="66" height="26" rx="9" fill={accent} />
        <path d="M10 14 L20 0 H46 L56 14 Z" fill={accent} />
        <path d="M17 13 L24 4 H42 L49 13 Z" fill="#fff" opacity=".7" />
        <circle cx="14" cy="38" r="7" fill="#1E2422" /><circle cx="52" cy="38" r="7" fill="#1E2422" />
      </g>
      <g transform="translate(262 128)">
        <rect width="38" height="38" rx="10" fill="#00B386" />
        <text x="19" y="27" textAnchor="middle" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="800" fontSize="22" fill="#fff">P</text>
      </g>
      {label && null}
    </svg>
  );
}
