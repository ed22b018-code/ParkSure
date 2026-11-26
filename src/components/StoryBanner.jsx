import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { useStore } from '../lib/store.jsx';

export default function StoryBanner({ step, title, children, action }) {
  const { story, setStory } = useStore();
  if (!story) return null;
  return (
    <div className="story" role="status">
      <span className="story__ico"><Sparkles size={17} /></span>
      <div className="story__text">
        <small>Exam-day demo · step {step} of 4</small>
        <b>{title}</b>
        {children && <p>{children}</p>}
        {action}
      </div>
      <button className="icon-btn story__x" onClick={() => setStory(false)} aria-label="Exit demo"><X size={17} /></button>
    </div>
  );
}

export function storyStart() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return d;
}
