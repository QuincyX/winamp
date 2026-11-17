import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { MOBILE_PLAYLIST_HEIGHT, MOBILE_PLAYLIST_WIDTH } from '../lib/constants';
import { trackLabel } from '../lib/format';
import { useElementSize } from '../hooks/useElementSize';
import { usePlayerStore } from '../store/playerStore';
import type { WindowId } from '../lib/types';
import { useMainMenu } from '../menus/mainMenu';
import { Icon } from './Icon';
import { MainWindow } from './MainWindow';
import { EqualizerWindow } from './EqualizerWindow';
import { PlaylistWindow } from './PlaylistWindow';

const ALL_WINDOWS: WindowId[] = ['main', 'equalizer', 'playlist'];
const MAIN_WIDTH = 275;

function MobileHeader(): ReactNode {
  const track = usePlayerStore((state) => state.tracks[state.currentIndex]);
  const status = usePlayerStore((state) => state.status);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const setAboutOpen = usePlayerStore((state) => state.setAboutOpen);
  const openMainMenu = useMainMenu();

  return (
    <header className="mobile-header">
      <button
        type="button"
        className="mobile-header__brand"
        title="Winamp menu"
        aria-label="Winamp menu"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          openMainMenu(rect.left, rect.bottom + 12);
        }}
      >
        <Icon name="bolt" />
        <span className="mobile-header__name">WINAMP</span>
        <em>2.91</em>
      </button>
      <span className={`mobile-header__status mobile-header__status--${status}`} aria-hidden="true" />
      <span className="mobile-header__track" title={track ? trackLabel(track) : undefined}>
        {track ? trackLabel(track) : 'NO TRACK LOADED'}
      </span>
      <button
        type="button"
        className="mobile-header__play"
        aria-label={status === 'playing' ? 'Pause' : 'Play'}
        onClick={togglePlay}
      >
        <Icon name={status === 'playing' ? 'pause' : 'play'} />
      </button>
      <button
        type="button"
        className="mobile-header__about"
        aria-label="About Winamp"
        onClick={() => setAboutOpen(true)}
      >
        ?
      </button>
    </header>
  );
}

interface SlotProps {
  width: number;
  height: number;
  scale: number;
  children: ReactNode;
}

function MobileWindowSlot({ width, height, scale, children }: SlotProps): ReactNode {
  return (
    <div
      className="mobile-window-slot"
      style={{ width: Math.round(width * scale), height: Math.round(height * scale) }}
    >
      <div
        className="mobile-stage"
        style={{ width, height, transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Portrait mobile layout: the three windows are docked in a vertical column
 * (main → equalizer → playlist) and the whole column scrolls. The EQ/PL buttons
 * in the main window and the View menu show or hide the lower panels.
 */
export function MobileDesktop(): ReactNode {
  const mainWindow = usePlayerStore((state) => state.windows.main);
  const eqWindow = usePlayerStore((state) => state.windows.equalizer);
  const playlistWindow = usePlayerStore((state) => state.windows.playlist);
  const [stackRef, stackSize] = useElementSize<HTMLDivElement>();

  const available = stackSize.width;
  const mainScale = available > 0 ? Math.min(available / MAIN_WIDTH, 1.5) : 1;

  useEffect(() => {
    // On entering the mobile stack, make sure all three windows are present.
    const state = usePlayerStore.getState();
    ALL_WINDOWS.forEach((id) => {
      if (!state.windows[id].open) state.openWindow(id);
    });
    state.focusWindow('main');
  }, []);

  return (
    <main className="mobile-desktop">
      <MobileHeader />
      <div className="mobile-stack-scroll">
        <div className="mobile-stack" ref={stackRef}>
          {mainWindow.open && (
            <MobileWindowSlot width={MAIN_WIDTH} height={mainWindow.shade ? 14 : 116} scale={mainScale}>
              <MainWindow />
            </MobileWindowSlot>
          )}
          {eqWindow.open && (
            <MobileWindowSlot width={MAIN_WIDTH} height={eqWindow.shade ? 14 : 116} scale={mainScale}>
              <EqualizerWindow />
            </MobileWindowSlot>
          )}
          {playlistWindow.open && (
            <MobileWindowSlot
              width={MOBILE_PLAYLIST_WIDTH}
              height={playlistWindow.shade ? 20 : MOBILE_PLAYLIST_HEIGHT}
              scale={mainScale}
            >
              <PlaylistWindow mobile />
            </MobileWindowSlot>
          )}
        </div>
      </div>
    </main>
  );
}
