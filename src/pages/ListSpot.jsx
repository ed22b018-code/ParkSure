import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, Car, Bike, Check, ImagePlus, X, ShieldCheck, Home as HomeIcon, Building2, Briefcase, PartyPopper, ArrowRight, ChevronDown, Info } from 'lucide-react';
import { useStore } from '../lib/store.jsx';
import { AREAS, DEFAULT_BAND, nearestPlace, MUMBAI_CENTER } from '../data/places.js';
import { SIZES, SPOT_TYPES, AMENITIES, inr, uid, fmtHours } from '../lib/utils.js';
import { PinPicker } from '../components/MapView.jsx';
import { PlaceSearch, Stepper, CarSizeIcon } from '../components/ui.jsx';
import SpotArt from '../components/SpotArt.jsx';
import { estimateMonthly } from './Host.jsx';

const STEPS = ['Location', 'Spot', 'Hours & price', 'Access'];
const HOUR_PRESETS = [
  { id: 'all', label: 'All day', sub: '24 hours', v: [0, 24] },
  { id: 'work', label: "While I'm at work", sub: '9 AM – 7 PM', v: [9, 19] },
  { id: 'day', label: 'Daytime', sub: '7 AM – 11 PM', v: [7, 23] },
  { id: 'custom', label: 'Custom', sub: 'Set your own' },
];

async function compress(file) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(file); });
  const scale = Math.min(1, 900 / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.72);
}

export default function ListSpot() {
  const nav = useNavigate();
  const { state, addSpot, setHost, showToast } = useStore();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [jump, setJump] = useState(null);
  const [showDims, setShowDims] = useState(false);
  const [f, setF] = useState({
    pos: { lat: 19.0596, lng: 72.8295 },
    society: '', unit: '',
    vehicles: ['car', 'bike'], maxSize: 'sedan', type: 'stilt', amenities: ['covered'],
    dims: { l: '', w: '', h: '' },
    days: 'all', preset: 'work', hours: [9, 19],
    carPrice: null, bikePrice: null,
    access: 'society', permission: false, instructions: '', photos: [],
    name: state.host.name || '', phone: state.host.phone || '',
  });
  const set = (patch) => setF((x) => ({ ...x, ...patch }));

  const near = nearestPlace(f.pos.lat, f.pos.lng);
  const area = near.area;
  const [lo, hi] = (AREAS[area] || { band: DEFAULT_BAND }).band;
  const suggestCar = Math.round((lo + hi) / 2 / 10) * 10;
  const suggestBike = Math.max(15, Math.round((suggestCar * 0.3) / 5) * 5);
  const carPrice = f.carPrice ?? suggestCar;
  const bikePrice = f.bikePrice ?? suggestBike;
  const hasCar = f.vehicles.includes('car');
  const hasBike = f.vehicles.includes('bike');
  const hoursPerDay = f.hours[1] - f.hours[0];
  const est = estimateMonthly(hasCar ? carPrice : bikePrice, hoursPerDay) * (f.days === 'all' ? 1 : f.days === 'weekdays' ? 5 / 7 : 2 / 7);

  const errors = useMemo(() => {
    const e = [];
    if (step === 0 && f.society.trim().length < 3) e.push('Add your building or society name');
    if (step === 1 && !f.vehicles.length) e.push('Choose at least one vehicle type');
    if (step === 2 && hoursPerDay < 1) e.push('End time must be after start time');
    if (step === 3) {
      if (f.access === 'society' && !f.permission) e.push('Confirm your society allows this');
      if (f.name.trim().length < 2) e.push('Add your name');
      if (!/^[6-9]\d{9}$/.test(f.phone.replace(/\D/g, '').slice(-10)) || f.phone.replace(/\D/g, '').length < 10) e.push('Add a valid 10-digit mobile number');
    }
    return e;
  }, [step, f, hoursPerDay]);

  const draftSpot = {
    id: 'preview', society: f.society || 'Your spot', type: f.type, area, photos: f.photos,
  };

  const publish = () => {
    const phone = f.phone.replace(/\D/g, '').slice(-10);
    const dims = f.dims.l && f.dims.w
      ? { l: +f.dims.l, w: +f.dims.w, h: f.dims.h ? +f.dims.h : null }
      : { l: { hatchback: 4.0, sedan: 4.8, suv: 5.3 }[f.maxSize], w: { hatchback: 2.2, sedan: 2.4, suv: 2.6 }[f.maxSize], h: f.dims.h ? +f.dims.h : null };
    const spot = {
      id: 'my-' + uid(),
      society: f.society.trim(),
      type: f.type,
      area,
      landmark: `Near ${near.name.replace(/ \(.*\)/, '')}`,
      address: `${f.unit ? f.unit.trim() + ', ' : ''}${f.society.trim()}, ${area}, Mumbai`,
      lat: f.pos.lat, lng: f.pos.lng,
      vehicles: f.vehicles,
      maxSize: hasCar ? f.maxSize : null,
      dims: hasCar ? dims : { l: 2.0, w: 1.0, h: null },
      carPrice: hasCar ? carPrice : null,
      bikePrice: hasBike ? bikePrice : null,
      hours: f.hours, days: f.days,
      access: f.access,
      amenities: f.amenities,
      instructions: f.instructions.trim() || 'Show your ParkSure gate pass to security at the main gate.',
      hostName: f.name.trim(),
      hostPhone: `+91 ${phone.slice(0, 2)}•••••${phone.slice(-3)}`,
      hostSince: new Date().getFullYear(),
      rating: 5.0, reviews: 0,
      hostId: state.deviceId, active: true, photos: f.photos, isNew: true,
    };
    addSpot(spot);
    setHost({ name: f.name.trim(), phone });
    setDone(spot);
    showToast('Your spot is live');
  };

  if (done) {
    return (
      <div className="page list-done">
        <div className="list-done__card card">
          <span className="list-done__ico"><PartyPopper size={30} /></span>
          <h1>Your spot is live!</h1>
          <p className="lead">Drivers heading near {done.landmark.replace('Near ', '')} can now book it. We'll notify you for every booking.</p>
          <SpotArt spot={done} className="list-done__art" />
          <div className="list-done__facts">
            <span><b>{done.carPrice ? inr(done.carPrice) : inr(done.bikePrice)}</b>/hr</span>
            <span>{fmtHours(done.hours)}</span>
            <span>Est. <b>{inr(est)}</b>/month</span>
          </div>
          <div className="btn-row btn-row--full">
            <button className="btn btn--primary btn--lg" onClick={() => nav('/host')}>Go to dashboard</button>
            <button className="btn btn--ghost btn--lg" onClick={() => nav(`/spot/${done.id}`)}>See it as a driver</button>
          </div>
        </div>
      </div>
    );
  }

  const next = () => { if (errors.length) return; if (step < 3) { setStep(step + 1); window.scrollTo(0, 0); } else publish(); };

  return (
    <div className="page wizard">
      <div className="page-bar">
        <button className="icon-btn icon-btn--soft" onClick={() => (step ? setStep(step - 1) : nav('/host'))} aria-label="Back"><ChevronLeft size={22} /></button>
        <h2>List your spot</h2>
        <span className="muted small">Step {step + 1} of 4</span>
      </div>
      <div className="wizard__progress">{STEPS.map((s, i) => <span key={s} className={i <= step ? 'is-on' : ''} />)}</div>

      <div className="wizard__grid">
        <aside className="wizard__steps">
          {STEPS.map((s, i) => (
            <button key={s} className={`wstep ${i === step ? 'is-cur' : ''} ${i < step ? 'is-done' : ''}`} onClick={() => i < step && setStep(i)}>
              <span>{i < step ? <Check size={14} /> : i + 1}</span>{s}
            </button>
          ))}
          <div className="wizard__est">
            <small>Estimated earnings</small>
            <b>{inr(est)}<span>/mo</span></b>
          </div>
        </aside>

        <div className="wizard__body">
          {step === 0 && (
            <>
              <h1 className="wizard__h">Where is your parking spot?</h1>
              <p className="muted">Drivers see only the rough area. Your exact address is shared after they book.</p>
              <button className="search-field" onClick={() => setSearchOpen(true)}><Search size={18} /> Search your building or area</button>
              <PinPicker value={f.pos} jumpTo={jump} onChange={(pos) => set({ pos })} />
              <p className="note"><Info size={15} /> Area detected: <b>{area}</b> · near {near.name}</p>
              <label className="field-label" htmlFor="soc">Building / society name</label>
              <input id="soc" className="input" placeholder="e.g. Sea Glimpse CHS" value={f.society} onChange={(e) => set({ society: e.target.value })} />
              <label className="field-label" htmlFor="unit">Wing, flat or spot number <span className="muted">(private)</span></label>
              <input id="unit" className="input" placeholder="e.g. B-204, Spot P12" value={f.unit} onChange={(e) => set({ unit: e.target.value })} />
            </>
          )}

          {step === 1 && (
            <>
              <h1 className="wizard__h">What can park here?</h1>
              <div className="seg seg--big">
                {[['car', Car, 'Car'], ['bike', Bike, 'Bike']].map(([k, Ico, label]) => (
                  <button key={k} className={f.vehicles.includes(k) ? 'is-on' : ''}
                    onClick={() => set({ vehicles: f.vehicles.includes(k) ? f.vehicles.filter((x) => x !== k) : [...f.vehicles, k] })}>
                    <Ico size={26} /><span>{label}</span>{f.vehicles.includes(k) && <Check size={16} className="seg__tick" />}
                  </button>
                ))}
              </div>
              <p className="muted small">Pick both if a bike can fit when no car is parked.</p>

              {hasCar && (
                <>
                  <div className="field-label">Biggest car that fits comfortably</div>
                  <div className="size-cards">
                    {Object.entries(SIZES).map(([k, s]) => (
                      <button key={k} className={`size-card ${f.maxSize === k ? 'is-on' : ''}`} onClick={() => set({ maxSize: k })}>
                        <CarSizeIcon size={k} /><b>{s.label}</b><small>{s.eg}</small>
                      </button>
                    ))}
                  </div>
                  <button className="btn btn--link" onClick={() => setShowDims(!showDims)}>
                    {showDims ? 'Hide' : 'Add'} exact measurements (optional) <ChevronDown size={16} className={showDims ? 'rot' : ''} />
                  </button>
                  {showDims && (
                    <div className="dims">
                      {[['l', 'Length'], ['w', 'Width'], ['h', 'Height limit']].map(([k, label]) => (
                        <label key={k}><small>{label} (m)</small>
                          <input className="input" inputMode="decimal" placeholder={k === 'h' ? 'If any' : k === 'l' ? '5.0' : '2.5'} value={f.dims[k]}
                            onChange={(e) => set({ dims: { ...f.dims, [k]: e.target.value.replace(/[^0-9.]/g, '') } })} />
                        </label>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div className="field-label">Type of spot</div>
              <div className="option-grid">
                {Object.entries(SPOT_TYPES).map(([k, t]) => (
                  <button key={k} className={`option ${f.type === k ? 'is-on' : ''}`} onClick={() => set({ type: k, amenities: k === 'open' ? f.amenities.filter((a) => a !== 'covered') : [...new Set([...f.amenities, 'covered'])] })}>
                    <span className="option__text"><b>{t.label}</b><small>{t.desc}</small></span><span className="radio" />
                  </button>
                ))}
              </div>

              <div className="field-label">What does it have?</div>
              <div className="chips">
                {Object.entries(AMENITIES).map(([k, label]) => (
                  <button key={k} className={`chip ${f.amenities.includes(k) ? 'is-on' : ''}`}
                    onClick={() => set({ amenities: f.amenities.includes(k) ? f.amenities.filter((a) => a !== k) : [...f.amenities, k] })}>
                    {f.amenities.includes(k) && <Check size={14} />} {label}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="wizard__h">When is it free, and for how much?</h1>
              <div className="field-label">Days</div>
              <div className="seg">
                {[['all', 'Every day'], ['weekdays', 'Weekdays'], ['weekends', 'Weekends']].map(([k, l]) => (
                  <button key={k} className={f.days === k ? 'is-on' : ''} onClick={() => set({ days: k })}>{l}</button>
                ))}
              </div>
              <div className="field-label">Hours</div>
              <div className="option-grid">
                {HOUR_PRESETS.map((p) => (
                  <button key={p.id} className={`option ${f.preset === p.id ? 'is-on' : ''}`} onClick={() => set({ preset: p.id, hours: p.v || f.hours })}>
                    <span className="option__text"><b>{p.label}</b><small>{p.sub}</small></span><span className="radio" />
                  </button>
                ))}
              </div>
              {f.preset === 'custom' && (
                <div className="dims dims--2">
                  <label><small>From</small>
                    <select className="input" value={f.hours[0]} onChange={(e) => set({ hours: [+e.target.value, f.hours[1]] })}>
                      {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{fmtHours([h, h + 1]).split(' – ')[0]}</option>)}
                    </select>
                  </label>
                  <label><small>Until</small>
                    <select className="input" value={f.hours[1]} onChange={(e) => set({ hours: [f.hours[0], +e.target.value] })}>
                      {Array.from({ length: 24 }, (_, i) => i + 1).map((h) => <option key={h} value={h}>{h === 24 ? 'Midnight' : fmtHours([h, h + 1]).split(' – ')[0]}</option>)}
                    </select>
                  </label>
                </div>
              )}

              <div className="field-label">Price per hour</div>
              <div className="price-box">
                {hasCar && (
                  <div className="price-line">
                    <span><Car size={18} /> Car</span>
                    <Stepper value={carPrice} onChange={(v) => set({ carPrice: v })} min={20} max={300} format={(v) => inr(v)} />
                  </div>
                )}
                {hasBike && (
                  <div className="price-line">
                    <span><Bike size={18} /> Bike</span>
                    <Stepper value={bikePrice} onChange={(v) => set({ bikePrice: v })} min={10} max={100} format={(v) => inr(v)} />
                  </div>
                )}
                <p className="note note--green"><Info size={15} /> Spots like yours in {area} go for {inr(lo)}–{inr(hi)}/hr for cars.
                  {(carPrice !== suggestCar || bikePrice !== suggestBike) && <button className="btn btn--link btn--inline" onClick={() => set({ carPrice: suggestCar, bikePrice: suggestBike })}>Use suggested</button>}
                </p>
              </div>
              <div className="est-strip">
                <span>Estimated earnings</span>
                <b>{inr(est)} / month</b>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="wizard__h">How do drivers get in?</h1>
              <div className="field-label">Who manages entry to this spot?</div>
              <div className="option-list">
                {[['independent', HomeIcon, 'My own house or bungalow', 'I control the gate'], ['society', Building2, 'Housing society', 'There is a watchman or society office'], ['commercial', Briefcase, 'Office or commercial building', 'Managed by building security']].map(([k, Ico, l, sub]) => (
                  <button key={k} className={`option ${f.access === k ? 'is-on' : ''}`} onClick={() => set({ access: k })}>
                    <span className="option__ico"><Ico size={20} /></span>
                    <span className="option__text"><b>{l}</b><small>{sub}</small></span><span className="radio" />
                  </button>
                ))}
              </div>
              {f.access !== 'independent' && (
                <label className="check">
                  <input type="checkbox" checked={f.permission} onChange={(e) => set({ permission: e.target.checked })} />
                  <span><b>{f.access === 'society' ? 'My society allows me to rent out my allotted spot' : 'Building management allows visitor parking here'}</b>
                    <small>Many societies need a quick NOC. Spots with permission show a “Society approved” badge and get booked more.</small></span>
                </label>
              )}

              <label className="field-label" htmlFor="instr">Instructions for the driver</label>
              <textarea id="instr" className="input" rows={3} placeholder="e.g. Tell the watchman you're here for B-204. Spot P12 is on the left after the ramp." value={f.instructions} onChange={(e) => set({ instructions: e.target.value })} />

              <div className="field-label">Photos <span className="muted">(optional — spots with photos get booked 2× more)</span></div>
              <div className="photos">
                {f.photos.map((p, i) => (
                  <div key={i} className="photo"><img src={p} alt={`Spot photo ${i + 1}`} /><button onClick={() => set({ photos: f.photos.filter((_, j) => j !== i) })} aria-label="Remove photo"><X size={14} /></button></div>
                ))}
                {f.photos.length < 3 && (
                  <label className="photo photo--add">
                    <ImagePlus size={22} /><small>Add photo</small>
                    <input type="file" accept="image/*" hidden onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { const d = await compress(file); set({ photos: [...f.photos, d] }); } catch { showToast('Could not read that photo', 'warn'); } } e.target.value = ''; }} />
                  </label>
                )}
              </div>

              <div className="dims dims--2">
                <label><small>Your name</small><input className="input" value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Full name" /></label>
                <label><small>Mobile number</small><input className="input" inputMode="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value.replace(/[^\d+ ]/g, '').slice(0, 14) })} placeholder="98XXXXXXXX" /></label>
              </div>
              <p className="note"><ShieldCheck size={15} /> Drivers call you through a masked number. Your real number is never shown.</p>
            </>
          )}

          <div className="wizard__foot">
            {errors.length > 0 && <span className="muted small">{errors[0]}</span>}
            <button className="btn btn--primary btn--lg" disabled={errors.length > 0} onClick={next}>
              {step < 3 ? <>Continue <ArrowRight size={18} /></> : 'Publish my spot'}
            </button>
          </div>
        </div>

        <aside className="wizard__preview">
          <div className="card">
            <small className="muted">Preview</small>
            <SpotArt spot={draftSpot} className="wizard__preview-art" />
            <b>{SPOT_TYPES[f.type].label} · {f.society || 'Your building'}</b>
            <small className="muted block">Near {near.name} · {area}</small>
            <div className="mt-8"><b className="green">{hasCar ? inr(carPrice) : inr(bikePrice)}</b><small>/hr</small></div>
          </div>
        </aside>
      </div>

      <PlaceSearch open={searchOpen} onClose={() => setSearchOpen(false)} placeholder="Search your building or area" onPick={(p) => { setSearchOpen(false); const pos = { lat: p.lat, lng: p.lng }; set({ pos }); setJump(pos); }} />
    </div>
  );
}

export { MUMBAI_CENTER };
