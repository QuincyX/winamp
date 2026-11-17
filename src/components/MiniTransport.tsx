import type { ReactNode } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { Icon } from './Icon';

interface MiniTransportProps {
  className?: string;
}

export function MiniTransport({ className }: MiniTransportProps): ReactNode {
  const play = usePlayerStore((state) => state.play);
  const pause = usePlayerStore((state) => state.pause);
  const stop = usePlayerStore((state) => state.stop);
  const next = usePlayerStore((state) => state.next);
  const previous = usePlayerStore((state) => state.previous);

  return (
    <div className={`mini-transport${className ? ` ${className}` : ''}`}>
      <button type="button" title="Previous (Z)" aria-label="Previous" onClick={previous}>
        <Icon name="previous" />
      </button>
      <button type="button" title="Play (X)" aria-label="Play" onClick={play}>
        <Icon name="play" />
      </button>
      <button type="button" title="Pause (C)" aria-label="Pause" onClick={pause}>
        <Icon name="pause" />
      </button>
      <button type="button" title="Stop (V)" aria-label="Stop" onClick={stop}>
        <Icon name="stop" />
      </button>
      <button type="button" title="Next (B)" aria-label="Next" onClick={next}>
        <Icon name="next" />
      </button>
    </div>
  );
}
