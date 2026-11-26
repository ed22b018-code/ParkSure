import { PLACES, AREAS, DEFAULT_BAND, coastLng, distToRiver } from './places.js';

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SOCIETIES = [
  'Sea Glimpse CHS', 'Laxmi Niwas', 'Hill View Apartments', 'Rizvi Park', 'Shanti Kunj CHS',
  'Gulmohar Residency', 'Om Sai Tower', 'Palm Court', 'Kamal Kunj', 'Sagar Darshan',
  'Ashiana Bungalow', 'Mehta House', 'Silver Oak CHS', 'Navjivan Society', 'Prem Villa',
  'Krishna Kunj', 'Usha Sadan', 'Neelkanth Heights', 'Anand Bhavan', 'Sunshine CHS',
  'Rose Garden Apts', 'Vasant Vihar', 'Jeevan Jyot', 'Harbour View', 'Daulat Mahal',
  'Pushpa Kunj', 'Ganga Jamuna CHS', 'Trilok Tower', 'Sai Darshan', 'Bluebell Apts',
  'Mangal Murti', 'Kailash Kunj', 'Green Acres', 'Shree Ram Niwas', 'Coral Court',
  'Venus Apartments', 'Swastik Plaza', 'Godavari CHS', 'Ivory Tower', 'Mahavir Darshan',
];
const HOSTS = [
  'Priya Nair', 'Rajesh Shah', 'Fatima Sheikh', 'Anil Kulkarni', 'Meera Iyer', 'Sanjay Patil',
  'Neha Desai', 'Farhan Khan', 'Kavita Joshi', 'Rohan Mehta', 'Sunita Rao', 'Vikram Bhosale',
  'Aditi Sawant', 'Imran Qureshi', 'Deepa Menon', 'Harish Gala', 'Shalini Pinto', 'Mahesh Gawde',
];

const TYPES = [
  ['basement', 0.32], ['stilt', 0.28], ['open', 0.25], ['garage', 0.15],
];

function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
function weighted(r, pairs) {
  let x = r();
  for (const [v, w] of pairs) { if ((x -= w) <= 0) return v; }
  return pairs[0][0];
}

const INSTRUCTIONS = {
  society: [
    'Show your ParkSure gate pass to the watchman at the main gate. Spot is marked with a green P sign.',
    'Tell security you are a ParkSure guest for {flat}. Park in the bay with my flat number painted on the wall.',
    'Enter from the side gate on {street}. The guard has your vehicle number — just show the pass.',
  ],
  independent: [
    'Gate opens inwards — please close it behind you. Park on the left, leave space for the scooter.',
    'Ring the bell once, my father will open the gate. Spot is right inside the compound.',
  ],
  commercial: [
    'Use the visitor lane at the building entrance. Scan the pass QR at the boom barrier.',
    'Take the ramp to level P1. Spot number is on your pass. Security desk is near the lift.',
  ],
};

export function buildSeedSpots() {
  const r = rng(20261126);
  const spots = [];
  let s = 0;
  PLACES.forEach((place, pi) => {
    const count = pi % 3 === 0 ? 4 : 3;
    const area = AREAS[place.area] || { band: DEFAULT_BAND, streets: ['Main Road'] };
    for (let i = 0; i < count; i++) {
      const angle = r() * Math.PI * 2;
      const dist = i === 0 ? 120 + r() * 180 : i === 1 ? 220 + r() * 300 : 300 + r() * 520; // metres from destination
      let lat = place.lat + (dist * Math.cos(angle)) / 111111;
      let lng = place.lng + (dist * Math.sin(angle)) / (111111 * Math.cos((place.lat * Math.PI) / 180));
      if (lng < coastLng(lat) + 0.0014) lng = place.lng + Math.abs(lng - place.lng) + 0.0006; // keep it on land
      if (distToRiver(lat, lng) < 90) lat += lat > place.lat ? 0.0012 : -0.0012; // not in the river
      const type = weighted(r, TYPES);
      const vx = r();
      const vehicles = i === 0 || vx < 0.62 ? ['car', 'bike'] : vx < 0.88 ? ['car'] : ['bike'];
      const sx = r();
      const maxSize = vehicles.includes('car') ? (i === 0 || sx < 0.4 ? 'suv' : sx < 0.82 ? 'sedan' : 'hatchback') : null;
      const dims = maxSize
        ? {
            l: { hatchback: 4.0, sedan: 4.8, suv: 5.3 }[maxSize],
            w: { hatchback: 2.2, sedan: 2.4, suv: 2.6 }[maxSize],
            h: type === 'basement' ? +(2.0 + r() * 0.4).toFixed(1) : null,
          }
        : { l: 2.0, w: 1.0, h: null };
      const [lo, hi] = area.band;
      const carPrice = Math.round((lo + r() * (hi - lo)) / 10) * 10;
      const bikePrice = Math.max(15, Math.round((carPrice * 0.3) / 5) * 5);
      const hx = r();
      const hours = i === 0 || hx < 0.5 ? [0, 24] : hx < 0.78 ? [7, 23] : [8, 20];
      const dx = r();
      const days = i === 0 || dx < 0.8 ? 'all' : dx < 0.92 ? 'weekdays' : 'weekends';
      const access = type === 'garage' ? 'independent' : r() < 0.18 ? 'commercial' : 'society';
      const amenities = [];
      if (type === 'basement' || type === 'stilt' || type === 'garage') amenities.push('covered');
      if (r() < 0.7) amenities.push('cctv');
      if (access !== 'independent' && r() < 0.75) amenities.push('guard');
      if (r() < 0.16 && vehicles.includes('car')) amenities.push('ev');
      const society = SOCIETIES[s % SOCIETIES.length];
      const street = pick(r, area.streets);
      const flat = `${pick(r, ['A', 'B', 'C'])}-${Math.floor(1 + r() * 12)}0${Math.floor(1 + r() * 4)}`;
      const instr = pick(r, INSTRUCTIONS[access]).replace('{flat}', flat).replace('{street}', street);
      spots.push({
        id: `sp-${String(s + 1).padStart(3, '0')}`,
        society,
        type,
        area: place.area,
        landmark: `Near ${place.name.replace(/ \(.*\)/, '')}`,
        address: `${access === 'independent' ? '' : flat + ', '}${society}, ${street}, ${place.area}, Mumbai`,
        lat, lng,
        vehicles,
        maxSize,
        dims,
        carPrice: vehicles.includes('car') ? carPrice : null,
        bikePrice: vehicles.includes('bike') ? bikePrice : null,
        hours,
        days,
        access,
        amenities,
        instructions: instr,
        hostName: HOSTS[s % HOSTS.length],
        hostPhone: '+91 98•••••' + String(10 + Math.floor(r() * 89)),
        hostSince: 2024 + Math.floor(r() * 2),
        rating: +(4.4 + r() * 0.6).toFixed(1),
        reviews: Math.floor(6 + r() * 140),
        hostId: 'seed',
        active: true,
        photos: [],
      });
      s++;
    }
  });
  // Two spots belong to the demo host so the host dashboard has something to show
  spots[9].hostId = 'demo-host';
  spots[9].hostName = 'Priya Nair';
  spots[10].hostId = 'demo-host';
  spots[10].hostName = 'Priya Nair';
  return spots;
}

export const SEED_SPOTS = buildSeedSpots();

// Bookings on the demo host's spots, generated relative to "now" so the dashboard always looks alive
export function buildDemoHostBookings(now = new Date()) {
  const r = rng(77);
  const demoSpots = SEED_SPOTS.filter((x) => x.hostId === 'demo-host');
  const plates = ['MH 02 EK 4471', 'MH 01 CZ 9012', 'MH 47 AB 2210', 'MH 03 DN 7781', 'MH 02 FG 1186', 'MH 04 HJ 5520', 'MH 02 BX 0091', 'MH 01 AL 3349'];
  const names = ['Ankit', 'Shreya', 'Mohit', 'Zoya', 'Kunal', 'Ritika', 'Arjun', 'Pooja'];
  const out = [];
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysSoFar = Math.max(1, Math.floor((now - monthStart) / 86400000));
  for (let i = 0; i < 16; i++) {
    const spot = demoSpots[i % demoSpots.length];
    const dayOffset = Math.floor(r() * daysSoFar);
    const start = new Date(monthStart.getTime() + dayOffset * 86400000);
    start.setHours(9 + Math.floor(r() * 9), r() < 0.5 ? 0 : 30, 0, 0);
    if (start > now) continue;
    const hrs = 1 + Math.floor(r() * 4);
    const vehicle = spot.vehicles.includes('car') && r() < 0.8 ? 'car' : 'bike';
    const rate = vehicle === 'car' ? spot.carPrice : spot.bikePrice || spot.carPrice;
    out.push(mkDemo(i, spot, start, hrs, vehicle, rate, plates[i % plates.length], names[i % names.length], 'completed'));
  }
  // Two upcoming ones
  const up1 = new Date(now); up1.setHours(now.getHours() + 3, 0, 0, 0);
  const up2 = new Date(now); up2.setDate(now.getDate() + 1); up2.setHours(10, 30, 0, 0);
  out.push(mkDemo(90, demoSpots[0], up1, 2, 'car', demoSpots[0].carPrice, 'MH 02 DQ 6612', 'Rahul', 'confirmed'));
  out.push(mkDemo(91, demoSpots[1], up2, 4, 'car', demoSpots[1].carPrice, 'MH 01 BT 4420', 'Sneha', 'confirmed'));
  return out;
}

function mkDemo(i, spot, start, hrs, vehicle, rate, plate, guestName, status) {
  return {
    id: `demo-bk-${i}`,
    code: `PS-${(1000 + i * 37).toString(36).toUpperCase()}`,
    spotId: spot.id,
    guestId: 'someone-else',
    guestName,
    vehicleType: vehicle,
    vehicleNumber: plate,
    start: start.toISOString(),
    hours: hrs,
    rate,
    amount: rate * hrs,
    fee: 10,
    status,
    createdAt: start.toISOString(),
    demo: true,
  };
}
