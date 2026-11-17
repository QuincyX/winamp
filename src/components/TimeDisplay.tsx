import type { ReactNode } from 'react';
import { formatClock, timeParts } from '../lib/format';
import { usePlayerStore } from '../store/playerStore';

interface TimeDisplayProps {
  compact?: boolean;
}

export function TimeDisplay({ compact = false }: TimeDisplayProps): ReactNode {
  const elapsed = usePlayerStore((state) => state.elapsed);
  const duration = usePlayerStore((state) => state.duration);
  const timeMode = usePlayerStore((state) => state.timeMode);
  const status = usePlayerStore((state) => state.status);
  const hasTracks = usePlayerStore((state) => state.tracks.length > 0);
  const toggleTimeMode = usePlayerStore((state) => state.toggleTimeMode);

  if (!hasTracks) {
    return <div className={`time-display${compact ? ' is-compact' : ''}`} aria-hidden="true" />;
  }

  const seconds = timeMode === 'elapsed' ? elapsed : Math.max(0, (duration || 0) - elapsed);
  const parts = timeParts(seconds, false);
  const label = `${timeMode === 'elapsed' ? 'Elapsed' : 'Remaining'} ${formatClock(seconds)} — click toggles`;

  if (compact) {
    return (
      <div className="time-display is-compact" title={label}>
        <span className="time-display__compact-text">
          {timeMode === 'remaining' ? '-' : ''}
          {formatClock(seconds)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`time-display${status === 'paused' ? ' is-paused' : ''}`}
      onClick={toggleTimeMode}
      title={label}
      role="button"
      tabIndex={0}
      aria-label={label}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleTimeMode();
        }
      }}
    >
      {timeMode === 'remaining' && <span className="time-display__minus">-</span>}
      <span className="time-display__digit" style={{ left: 9 }}>
        {parts.minutesFirst}
      </span>
      <span className="time-display__digit" style={{ left: 21 }}>
        {parts.minutesSecond}
      </span>
      <span className="time-display__colon" aria-hidden="true">
        <i />
        <i />
      </span>
      <span className="time-display__digit" style={{ left: 39 }}>
        {parts.secondsFirst}
      </span>
      <span className="time-display__digit" style={{ left: 51 }}>
        {parts.secondsSecond}
      </span>
    </div>
  );
}
