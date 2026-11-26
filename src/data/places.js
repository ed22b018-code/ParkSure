// Curated Mumbai destinations where parking is hardest. Coordinates are approximate.
export const CATEGORIES = {
  exam: { label: 'Exam centre', emoji: '📝' },
  hospital: { label: 'Hospital', emoji: '🏥' },
  mall: { label: 'Mall', emoji: '🛍️' },
  market: { label: 'Market', emoji: '🛒' },
  station: { label: 'Station', emoji: '🚉' },
  temple: { label: 'Temple', emoji: '🛕' },
  event: { label: 'Events', emoji: '🎟️' },
  beach: { label: 'Beach', emoji: '🌊' },
  landmark: { label: 'Landmark', emoji: '📍' },
};

export const PLACES = [
  { id: 'mithibai', name: 'Mithibai College', area: 'Vile Parle W', cat: 'exam', lat: 19.1035, lng: 72.837 },
  { id: 'nmims', name: 'NMIMS University', area: 'Vile Parle W', cat: 'exam', lat: 19.1072, lng: 72.8372 },
  { id: 'nesco', name: 'NESCO Centre', area: 'Goregaon E', cat: 'event', lat: 19.1546, lng: 72.8556 },
  { id: 'lilavati', name: 'Lilavati Hospital', area: 'Bandra W', cat: 'hospital', lat: 19.051, lng: 72.8286 },
  { id: 'kokilaben', name: 'Kokilaben Hospital', area: 'Andheri W', cat: 'hospital', lat: 19.1315, lng: 72.8253 },
  { id: 'hinduja', name: 'P.D. Hinduja Hospital', area: 'Mahim', cat: 'hospital', lat: 19.0335, lng: 72.8388 },
  { id: 'linking', name: 'Linking Road', area: 'Bandra W', cat: 'market', lat: 19.0647, lng: 72.834 },
  { id: 'palladium', name: 'Phoenix Palladium', area: 'Lower Parel', cat: 'mall', lat: 18.9944, lng: 72.8256 },
  { id: 'infiniti', name: 'Infiniti Mall', area: 'Andheri W', cat: 'mall', lat: 19.1405, lng: 72.8314 },
  { id: 'shivaji', name: 'Shivaji Park', area: 'Dadar W', cat: 'landmark', lat: 19.027, lng: 72.8381 },
  { id: 'siddhivinayak', name: 'Siddhivinayak Temple', area: 'Prabhadevi', cat: 'temple', lat: 19.0169, lng: 72.8302 },
  { id: 'dadar-stn', name: 'Dadar Station (West)', area: 'Dadar W', cat: 'station', lat: 19.019, lng: 72.843 },
  { id: 'andheri-stn', name: 'Andheri Station (West)', area: 'Andheri W', cat: 'station', lat: 19.1197, lng: 72.846 },
  { id: 'bandra-stn', name: 'Bandra Station (West)', area: 'Bandra W', cat: 'station', lat: 19.0544, lng: 72.84 },
  { id: 'jio', name: 'Jio World Centre', area: 'BKC', cat: 'event', lat: 19.0626, lng: 72.8679 },
  { id: 'juhu', name: 'Juhu Beach', area: 'Juhu', cat: 'beach', lat: 19.0988, lng: 72.8265 },
];

export const AREAS = {
  'Vile Parle W': { band: [40, 80], streets: ['Juhu Tara Road', 'N.S. Road', 'Bajaj Road', 'Irla Lane'] },
  'Goregaon E': { band: [30, 60], streets: ['Aarey Road', 'Off Western Express Highway', 'Gokuldham Road'] },
  'Bandra W': { band: [60, 110], streets: ['Hill Road', 'Carter Road', '14th Road', 'Perry Cross Road', 'Waterfield Road'] },
  'Andheri W': { band: [40, 80], streets: ['Veera Desai Road', 'J.P. Road', 'Lokhandwala Back Road', 'S.V. Road'] },
  'Lower Parel': { band: [80, 140], streets: ['Senapati Bapat Marg', 'Ganpatrao Kadam Marg', 'Tulsi Pipe Road'] },
  'Dadar W': { band: [50, 90], streets: ['Ranade Road', 'Gokhale Road', 'Keluskar Road', 'N.C. Kelkar Road'] },
  Prabhadevi: { band: [60, 100], streets: ['Appasaheb Marathe Marg', 'Kakasaheb Gadgil Marg'] },
  BKC: { band: [80, 150], streets: ['G Block', 'Bandra Kurla Complex Road', 'Kalanagar'] },
  Juhu: { band: [50, 90], streets: ['Juhu Tara Road', 'Gulmohar Road', 'JVPD Scheme'] },
  Mahim: { band: [50, 90], streets: ['L.J. Road', 'Lady Jamshedji Road', 'Cadell Road'] },
};

export const DEFAULT_BAND = [40, 90];

export function nearestPlace(lat, lng) {
  let best = PLACES[0];
  let bestD = Infinity;
  for (const p of PLACES) {
    const d = (p.lat - lat) ** 2 + (p.lng - lng) ** 2;
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

export const MUMBAI_CENTER = { lat: 19.07, lng: 72.845 };

// Approximate west coastline of Mumbai (lat, lng) — used by the map and to keep spots on land
const COAST = [
  [18.96, 72.81], [18.98, 72.812], [19.0, 72.814], [19.012, 72.822], [19.022, 72.83], [19.03, 72.834],
  [19.038, 72.836], [19.044, 72.829], [19.046, 72.819], [19.058, 72.82], [19.07, 72.823], [19.085, 72.824],
  [19.1, 72.824], [19.115, 72.823], [19.13, 72.814], [19.15, 72.808], [19.2, 72.804],
];
export function coastLng(lat) {
  if (lat <= COAST[0][0]) return COAST[0][1];
  for (let i = 1; i < COAST.length; i++) {
    const [a, la] = COAST[i - 1];
    const [b, lb] = COAST[i];
    if (lat <= b) return la + ((lat - a) / (b - a)) * (lb - la);
  }
  return COAST[COAST.length - 1][1];
}

