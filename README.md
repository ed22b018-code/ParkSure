# ParkSure

Book a guaranteed parking spot in a resident's society or driveway, a short walk from where you're going — or earn from your empty spot.

Prototype built for a product case study. Live in Mumbai (demo data).

## What works
- **Drivers:** search a destination (exam centres, hospitals, malls, stations or any place), pick time + vehicle (car size or bike), see spots that fit on a map, book with mock UPI, get a QR gate pass, extend, cancel, and use the "spot taken" guarantee to rebook for free.
- **Hosts:** earnings estimator, 4-step listing (pin on map, vehicle/size, hours/price with suggested range, access & society permission), dashboard with earnings, bookings, pause toggle and price edits. A sample host dashboard is available without listing.
- No sign-in. Data is stored in the browser (localStorage), so each device has its own demo state.

## Run locally
```bash
npm install
npm run dev
```

Stack: React + Vite, Leaflet with OpenStreetMap/CARTO tiles, deployed on Vercel.
