import type { ReactNode } from 'react';

export function DropOverlay(): ReactNode {
  return (
    <div className="drop-overlay" aria-live="polite">
      <div className="drop-overlay__frame">
        <span className="drop-overlay__title">DROP AUDIO FILES TO PLAY</span>
        <span className="drop-overlay__subtitle">MP3 · WAV · OGG · FLAC · M4A · AAC</span>
        <span className="drop-overlay__hint">松开鼠标，Winamp 会把它们加入播放列表</span>
      </div>
    </div>
  );
}
