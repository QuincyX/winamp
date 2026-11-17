import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { trackLabel } from '../lib/format';
import { usePlayerStore } from '../store/playerStore';

const MAX_CHARS = 31;
const SEPARATOR = '   ***   ';
const STEP_MS = 200;

export function Marquee(): ReactNode {
  const transientText = usePlayerStore((state) => state.transientText);
  const track = usePlayerStore((state) => state.tracks[state.currentIndex]);
  const index = usePlayerStore((state) => state.currentIndex);
  const llamaMode = usePlayerStore((state) => state.llamaMode);
  const [step, setStep] = useState(0);

  const fallback = llamaMode
    ? "IT REALLY WHIPS THE LLAMA'S ASS!"
    : 'WINAMP 2.91   ***   DRAG & DROP YOUR MP3 FILES   ***';
  const text = transientText || (track ? `${index + 1}. ${trackLabel(track)}` : fallback);

  useEffect(() => {
    setStep(0);
    if (text.length <= MAX_CHARS) return;
    let timer: number | undefined;
    const delay = window.setTimeout(() => {
      timer = window.setInterval(() => {
        setStep((current) => (current + 1) % (text.length + SEPARATOR.length));
      }, STEP_MS);
    }, 1600);
    return () => {
      window.clearTimeout(delay);
      if (timer) window.clearInterval(timer);
    };
  }, [text]);

  const looped = text.length > MAX_CHARS ? `${text}${SEPARATOR}${text}` : text.padEnd(MAX_CHARS, ' ');
  const visible = looped.slice(step, step + MAX_CHARS);

  return (
    <div className="marquee" title={text} aria-live="off">
      <span className="marquee__text">{visible}</span>
    </div>
  );
}
