import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageCircle, X, Send, Sparkles, Play } from 'lucide-react';
import { useStore } from '../lib/store.jsx';
import { PLACES } from '../data/places.js';
import { toQuery, saveLastSearch } from '../lib/search.js';
import { storyStart } from './StoryBanner.jsx';

const FAQ = [
  // drivers
  { id: 'book', who: 'driver', q: 'How do I book a spot?', k: ['book', 'how', 'reserve', 'find'],
    a: 'Type where you are going, pick your time and vehicle, and tap Find parking. Choose a spot, enter your vehicle number and pay with UPI. You get a gate pass right away.', cta: ['Find parking', '/'] },
  { id: 'taken', who: 'driver', q: 'What if the spot is taken when I arrive?', k: ['taken', 'occupied', 'blocked', 'not available', 'someone', 'guarantee'],
    a: 'Open your gate pass and tap "Spot taken or can\'t get in?". You get a full refund, and we book you the nearest free spot for free. That\'s the ParkSure guarantee.' },
  { id: 'cancel', who: 'driver', q: 'Can I cancel? Will I get a refund?', k: ['cancel', 'refund', 'money back'],
    a: 'Yes. Cancellation is free until your start time and the full amount goes back to your UPI within minutes. After the start time, bookings can\'t be cancelled.' },
  { id: 'extend', who: 'driver', q: 'Running late — can I extend my time?', k: ['extend', 'late', 'more time', 'overstay', 'longer'],
    a: 'Yes. On your gate pass tap "Extend 1 hr". If the next hour is free, it\'s added instantly at the same hourly price.' },
  { id: 'fit', who: 'driver', q: 'Will my car fit?', k: ['fit', 'size', 'suv', 'big', 'dimension', 'height'],
    a: 'Tell us your car size once (hatchback, sedan or SUV) and we only show spots it fits in. Each spot lists its size and height clearance, so basements are safe for taller cars too.' },
  { id: 'gate', who: 'driver', q: 'How do I get past security?', k: ['security', 'watchman', 'gate', 'guard', 'enter', 'qr', 'pass'],
    a: 'Show the QR gate pass to the watchman. Security already has your vehicle number and booking time, and your host\'s instructions are on the pass.' },
  { id: 'bike', who: 'driver', q: 'Can I park a bike or scooter?', k: ['bike', 'scooter', 'two wheeler', 'activa'],
    a: 'Yes. Switch your vehicle to Bike / scooter. Many spots take bikes too, usually at ₹15–40 an hour.' },
  { id: 'pay', who: 'driver', q: 'How do I pay?', k: ['pay', 'upi', 'gpay', 'phonepe', 'paytm', 'price', 'cost', 'charge', 'fee'],
    a: 'Pay with any UPI app. You pay the host\'s hourly price plus a flat ₹10 platform fee, with no hidden charges. (In this demo, no real money is charged.)' },
  // hosts
  { id: 'host', who: 'host', q: 'How do I rent out my spot?', k: ['rent', 'list', 'host', 'my spot', 'earn'],
    a: 'Go to Rent out → List your spot. It takes 4 quick steps: location, spot size, hours & price, and access. Your spot goes live as soon as you publish.', cta: ['List your spot', '/host/new'] },
  { id: 'earn', who: 'host', q: 'How much can I earn?', k: ['earn', 'income', 'money', 'how much'],
    a: 'It depends on your area and hours. A spot near a busy place in Bandra, free for 10 hours a day, can make around ₹9,500 a month. Try the calculator on the Rent out page.', cta: ['Open calculator', '/host'] },
  { id: 'society', who: 'host', q: 'Do I need my society\'s permission?', k: ['society', 'permission', 'noc', 'committee', 'legal'],
    a: 'If your spot is allotted by a housing society, yes. Many societies need a simple NOC. Spots with permission get a "Society approved" badge and are booked more.' },
  { id: 'paid', who: 'host', q: 'When do I get paid?', k: ['payout', 'paid', 'when', 'monday', 'settlement'],
    a: 'Every Monday, straight to your UPI. You keep 100% of the price you set. Drivers pay the platform fee.' },
  { id: 'overstay', who: 'host', q: 'What if a driver overstays?', k: ['overstay', 'late', 'doesn\'t leave', 'damage', 'safe'],
    a: 'Extra time is charged automatically and paid to you. Every booking is tied to a verified phone and vehicle number, so you always know who parked.' },
  { id: 'pause', who: 'host', q: 'Can I pause my spot?', k: ['pause', 'stop', 'off', 'holiday', 'block'],
    a: 'Yes, with one tap. Use the switch on your spot in the dashboard. Existing bookings stay, and no new ones come in.' },
];

const GREETING = { from: 'bot', text: "Hi! I'm Sure, the ParkSure helper. Ask me anything or pick a question below." };

function answerFor(text) {
  const t = text.toLowerCase();
  let best = null; let bestScore = 0;
  for (const f of FAQ) {
    const score = f.k.reduce((s, k) => s + (t.includes(k) ? k.length : 0), 0);
    if (score > bestScore) { best = f; bestScore = score; }
  }
  return best;
}

export default function HelpBot() {
  const loc = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([GREETING]);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');
  const bodyRef = useRef(null);
  const hostSide = loc.pathname.startsWith('/host');
  const { setVehicle, setStory, story } = useStore();
  const [nudge, setNudge] = useState(false);

  useEffect(() => {
    let greeted = false;
    try { greeted = sessionStorage.getItem('parksure:greeted') === '1'; } catch { /* ignore */ }
    if (greeted || story || loc.pathname.startsWith('/p/')) return undefined;
    const t = setTimeout(() => { setNudge(true); try { sessionStorage.setItem('parksure:greeted', '1'); } catch { /* ignore */ } }, 1400);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startDemo = () => {
    const place = PLACES.find((x) => x.id === 'mithibai');
    const s = { place, start: storyStart(), hours: 4 };
    setVehicle({ type: 'car', size: 'suv' });
    setStory(true);
    saveLastSearch(s);
    setNudge(false);
    setOpen(false);
    nav(`/search?${toQuery(s)}`);
  };

  useEffect(() => { bodyRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }); }, [msgs, typing, open]);

  const reply = (userText, faq) => {
    setMsgs((m) => [...m, { from: 'me', text: userText }]);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const f = faq || answerFor(userText);
      setMsgs((m) => [...m, f
        ? { from: 'bot', text: f.a, cta: f.cta }
        : { from: 'bot', text: "I'm not sure about that one yet. Our support team replies within 5 minutes, 7 AM – 11 PM. Tap \"Talk to a person\" and we'll call you back (demo).", human: true }]);
    }, 650);
  };

  const send = (e) => { e.preventDefault(); const v = text.trim(); if (!v) return; setText(''); reply(v); };
  const asked = new Set(msgs.filter((m) => m.from === 'me').map((m) => m.text));
  const ordered = [...FAQ.filter((f) => f.who === (hostSide ? 'host' : 'driver')), ...FAQ.filter((f) => f.who !== (hostSide ? 'host' : 'driver'))];
  const suggestions = ordered.filter((f) => !asked.has(f.q)).slice(0, 4);

  return (
    <>
      {nudge && !open && (
        <div className="bot-nudge" role="dialog" aria-label="Quick demo">
          <button className="bot-nudge__x" onClick={() => setNudge(false)} aria-label="Dismiss"><X size={15} /></button>
          <div className="bot-nudge__who"><span className="bot__avatar bot__avatar--sm"><Sparkles size={14} /></span><b>Sure</b><small>ParkSure helper</small></div>
          <p>Hi! 👋 Want to see ParkSure in 30 seconds? Let's book parking for an exam tomorrow at Mithibai College.</p>
          <div className="bot-nudge__btns">
            <button className="btn btn--primary btn--sm" onClick={startDemo}><Play size={14} /> Show me</button>
            <button className="btn btn--ghost btn--sm" onClick={() => setNudge(false)}>I'll explore</button>
          </div>
        </div>
      )}
      {!open && (
        <button className="bot-fab" onClick={() => { setOpen(true); setNudge(false); }} aria-label="Open help chat">
          <MessageCircle size={22} />
          <span className="bot-fab__label">Help</span>
        </button>
      )}
      {open && (
        <div className="bot" role="dialog" aria-label="ParkSure help chat">
          <div className="bot__head">
            <span className="bot__avatar"><Sparkles size={17} /></span>
            <div><b>Sure · ParkSure help</b><small>Usually replies instantly</small></div>
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close chat"><X size={19} /></button>
          </div>
          <div className="bot__body" ref={bodyRef}>
            {msgs.map((m, i) => (
              <div key={i} className={`bot__msg bot__msg--${m.from}`}>
                <p>{m.text}</p>
                {m.cta && <button className="bot__cta" onClick={() => { setOpen(false); nav(m.cta[1]); }}>{m.cta[0]} →</button>}
                {m.human && <button className="bot__cta" onClick={() => setMsgs((x) => [...x, { from: 'bot', text: "Done! A support agent will call you within 5 minutes. (This is a demo, so no call will actually come.)" }])}>Talk to a person →</button>}
              </div>
            ))}
            {typing && <div className="bot__msg bot__msg--bot bot__typing"><span /><span /><span /></div>}
          </div>
          <div className="bot__chips">
            {!hostSide && <button className="chip chip--sm chip--demo" onClick={startDemo}><Play size={13} /> Show me a 30-sec demo</button>}
            {suggestions.map((f) => <button key={f.id} className="chip chip--sm" onClick={() => reply(f.q, f)}>{f.q}</button>)}
          </div>
          <form className="bot__input" onSubmit={send}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your question…" aria-label="Your question" />
            <button type="submit" className="bot__send" disabled={!text.trim()} aria-label="Send"><Send size={17} /></button>
          </form>
        </div>
      )}
    </>
  );
}
