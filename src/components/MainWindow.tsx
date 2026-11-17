import { useRef } from 'react';
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { formatClock, formatKbps, formatKhz, clamp } from '../lib/format';
import { usePlayerStore } from '../store/playerStore';
import { useMainMenu } from '../menus/mainMenu';
import { useUi } from '../ui/UiContext';
import { WindowShell } from './WindowShell';
import { TitleBar } from './TitleBar';
import { TimeDisplay } from './TimeDisplay';
import { Marquee } from './Marquee';
import { Visualizer } from './Visualizer';
import { HorizontalSlider } from './HorizontalSlider';
import { Icon } from './Icon';
import { MiniTransport } from './MiniTransport';

function ClutterBar(): ReactNode {
  const openMainMenu = useMainMenu();
  const alwaysOnTop = usePlayerStore((state) => state.alwaysOnTop);
  const toggleAlwaysOnTop = usePlayerStore((state) => state.toggleAlwaysOnTop);
  const toggleDoubleSize = usePlayerStore((state) => state.toggleDoubleSize);
  const cycleVisMode = usePlayerStore((state) => state.cycleVisMode);
  const setAboutOpen = usePlayerStore((state) => state.setAboutOpen);

  return (
    <div className="clutter-bar" aria-label="Clutterbar">
      <button
        type="button"
        title="Winamp menu"
        className="clutter-bar__button"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          openMainMenu(rect.right + 2, rect.top - 2);
        }}
      >
        O
      </button>
      <button
        type="button"
        title="Always on top"
        className={`clutter-bar__button${alwaysOnTop ? ' is-on' : ''}`}
        onClick={toggleAlwaysOnTop}
      >
        A
      </button>
      <button type="button" title="About Winamp" className="clutter-bar__button" onClick={() => setAboutOpen(true)}>
        I
      </button>
      <button type="button" title="Double size" className="clutter-bar__button" onClick={toggleDoubleSize}>
        D
      </button>
      <button type="button" title="Visualization mode" className="clutter-bar__button" onClick={cycleVisMode}>
        V
      </button>
    </div>
  );
}

function Transport(): ReactNode {
  const play = usePlayerStore((state) => state.play);
  const pause = usePlayerStore((state) => state.pause);
  const stop = usePlayerStore((state) => state.stop);
  const next = usePlayerStore((state) => state.next);
  const previous = usePlayerStore((state) => state.previous);
  const status = usePlayerStore((state) => state.status);
  const eject = useUi().openFiles;

  return (
    <div className="transport" aria-label="Playback controls">
      <button type="button" className="transport__button" title="Previous (Z)" aria-label="Previous" onClick={previous}>
        <Icon name="previous" />
      </button>
      <button
        type="button"
        className={`transport__button${status === 'playing' ? ' is-active' : ''}`}
        title="Play (X)"
        aria-label="Play"
        onClick={play}
      >
        <Icon name="play" />
      </button>
      <button
        type="button"
        className={`transport__button${status === 'paused' ? ' is-active' : ''}`}
        title="Pause (C)"
        aria-label="Pause"
        onClick={pause}
      >
        <Icon name="pause" />
      </button>
      <button
        type="button"
        className={`transport__button${status === 'stopped' ? ' is-active' : ''}`}
        title="Stop (V)"
        aria-label="Stop"
        onClick={stop}
      >
        <Icon name="stop" />
      </button>
      <button type="button" className="transport__button" title="Next (B)" aria-label="Next" onClick={next}>
        <Icon name="next" />
      </button>
      <button
        type="button"
        className="transport__button transport__button--eject"
        title="Open files (L)"
        aria-label="Open files"
        onClick={eject}
      >
        <Icon name="eject" />
      </button>
    </div>
  );
}

function ShuffleRepeat(): ReactNode {
  const shuffle = usePlayerStore((state) => state.shuffle);
  const repeat = usePlayerStore((state) => state.repeat);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const cycleRepeat = usePlayerStore((state) => state.cycleRepeat);

  return (
    <div className="shuffle-repeat">
      <button
        type="button"
        className={`shuffle-button${shuffle ? ' is-on' : ''}`}
        title="Shuffle (S)"
        aria-pressed={shuffle}
        onClick={toggleShuffle}
      >
        <Icon name="shuffle" className="shuffle-button__icon" />
        <span>SHUFFLE</span>
      </button>
      <button
        type="button"
        className={`repeat-button${repeat !== 'off' ? ' is-on' : ''}`}
        title={`Repeat: ${repeat}`}
        aria-label={`Repeat ${repeat}`}
        onClick={cycleRepeat}
      >
        <Icon name="repeat" />
        {repeat === 'one' && <span className="repeat-button__one">1</span>}
      </button>
    </div>
  );
}

function WindowToggles(): ReactNode {
  const eqOpen = usePlayerStore((state) => state.windows.equalizer.open);
  const plOpen = usePlayerStore((state) => state.windows.playlist.open);
  const closeWindow = usePlayerStore((state) => state.closeWindow);
  const openWindow = usePlayerStore((state) => state.openWindow);

  const toggle = (id: 'equalizer' | 'playlist', open: boolean): void => {
    if (open) closeWindow(id);
    else openWindow(id);
  };

  return (
    <div className="window-toggles">
      <button
        type="button"
        className={`window-toggle${eqOpen ? ' is-on' : ''}`}
        title="Toggle Equalizer"
        aria-pressed={eqOpen}
        onClick={() => toggle('equalizer', eqOpen)}
      >
        <span className={`led${eqOpen ? ' is-on' : ''}`} />
        <Icon name="equalizer" className="window-toggle__icon" />
        <span>EQ</span>
      </button>
      <button
        type="button"
        className={`window-toggle${plOpen ? ' is-on' : ''}`}
        title="Toggle Playlist editor"
        aria-pressed={plOpen}
        onClick={() => toggle('playlist', plOpen)}
      >
        <span className={`led${plOpen ? ' is-on' : ''}`} />
        <Icon name="playlist" className="window-toggle__icon" />
        <span>PL</span>
      </button>
    </div>
  );
}

export function MainWindow(): ReactNode {
  const scale = usePlayerStore((state) => state.scale || 1);
  const shade = usePlayerStore((state) => state.windows.main.shade);
  const llamaMode = usePlayerStore((state) => state.llamaMode);
  const toggleLlama = usePlayerStore((state) => state.toggleLlama);
  const setAboutOpen = usePlayerStore((state) => state.setAboutOpen);
  const openMainMenu = useMainMenu();
  const duration = usePlayerStore((state) => state.duration);
  const elapsed = usePlayerStore((state) => state.elapsed);
  const status = usePlayerStore((state) => state.status);
  const volume = usePlayerStore((state) => state.volume);
  const balance = usePlayerStore((state) => state.balance);
  const setVolume = usePlayerStore((state) => state.setVolume);
  const setBalance = usePlayerStore((state) => state.setBalance);
  const seek = usePlayerStore((state) => state.seek);
  const flash = usePlayerStore((state) => state.flash);
  const cycleVisMode = usePlayerStore((state) => state.cycleVisMode);
  const visMode = usePlayerStore((state) => state.visMode);
  const currentTrack = usePlayerStore((state) => state.tracks[state.currentIndex]);
  const loading = usePlayerStore((state) => state.loading);
  const logoRef = useRef<HTMLButtonElement>(null);

  const openMenuFrom = (target: HTMLElement): void => {
    const rect = target.getBoundingClientRect();
    openMainMenu(rect.left - 2, rect.bottom + 1);
  };

  const shadeContent = shade ? (
    <div className="main-shade">
      <span className="main-shade__brand">WINAMP</span>
      <span className="main-shade__time">{formatClock(elapsed)}</span>
      <MiniTransport className="mini-transport--shade" />
    </div>
  ) : undefined;

  return (
    <WindowShell id="main" width={275} height={shade ? 14 : 116} className="main-window">
      <TitleBar
        id="main"
        title="WINAMP"
        scale={scale}
        showMinimize
        showShade
        showClose
        shade={shade}
        shadeContent={shadeContent}
        llama={llamaMode}
        variant="main"
        leftSlot={
          <button
            ref={logoRef}
            type="button"
            className="title-bar__logo"
            title="Winamp menu — double-click for the llama"
            aria-label="Winamp menu"
            onClick={(event: ReactMouseEvent<HTMLButtonElement>) => openMenuFrom(event.currentTarget)}
            onDoubleClick={toggleLlama}
          >
            <svg viewBox="0 0 16 12" aria-hidden="true" focusable="false">
              <path d="M1 9C2.4 2.6 4.5 2.4 6 6.2S9.6 11.4 11 5.2 13.8 1.2 15 5.2" />
            </svg>
          </button>
        }
      />
      {!shade && (
        <div
          className="main-body"
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            openMainMenu(event.clientX, event.clientY);
          }}
          onWheel={(event) => {
            if (event.deltaY === 0) return;
            const next = clamp(volume - Math.sign(event.deltaY) * 3, 0, 100);
            setVolume(next);
            flash(`VOLUME: ${next}%`);
          }}
        >
          <div className="lcd" aria-hidden="true" />
          <ClutterBar />
          <div className={`status-light status-light--${status}${loading ? ' is-working' : ''}`} aria-hidden="true">
            <span />
          </div>
          <TimeDisplay />
          <Visualizer
            className="main-visualizer"
            mode={visMode}
            onClick={cycleVisMode}
            title={`Visualization: ${visMode} (click to change)`}
            width={76}
            height={26}
          />
          <Marquee />
          <div className="stat-box stat-box--bitrate" title={currentTrack ? `${currentTrack.bitrate ?? '?'} kbps` : ''}>
            <span>{formatKbps(currentTrack?.bitrate)}</span>
          </div>
          <span className="stat-label stat-label--bitrate">kbps</span>
          <div className="stat-box stat-box--samplerate" title={currentTrack ? `${currentTrack.sampleRate ?? '?'} Hz` : ''}>
            <span>{formatKhz(currentTrack?.sampleRate)}</span>
          </div>
          <span className="stat-label stat-label--samplerate">kHz</span>
          <div className={`mono-stereo${status !== 'stopped' && currentTrack ? ' is-active' : ''}`}>
            <span className={`mono-stereo__word mono-stereo__word--mono${currentTrack?.channels === 1 ? ' is-on' : ''}`}>
              mono
            </span>
            <span
              className={`mono-stereo__word mono-stereo__word--stereo${
                currentTrack && currentTrack.channels !== 1 ? ' is-on' : ''
              }`}
            >
              stereo
            </span>
          </div>
          <HorizontalSlider
            className="volume"
            value={volume}
            min={0}
            max={100}
            ariaLabel="Volume"
            onChange={setVolume}
            onCommit={() => flash(`VOLUME: ${usePlayerStore.getState().volume}%`)}
          />
          <HorizontalSlider
            className="balance"
            value={balance}
            min={-100}
            max={100}
            ariaLabel="Balance"
            onChange={setBalance}
            onCommit={() => {
              const next = usePlayerStore.getState().balance;
              flash(`BALANCE: ${Math.abs(next)}% ${next < 0 ? 'LEFT' : next > 0 ? 'RIGHT' : 'CENTER'}`);
            }}
          />
          <WindowToggles />
          <HorizontalSlider
            className="seek"
            value={elapsed}
            min={0}
            max={Math.max(duration, 1)}
            step={1}
            ariaLabel="Seek position"
            disabled={!currentTrack || duration <= 0}
            onChange={(value) => seek(value, true)}
            onCommit={() => flash(`SEEK: ${formatClock(usePlayerStore.getState().elapsed)}`)}
          />
          <Transport />
          <ShuffleRepeat />
          <button
            type="button"
            className="about-logo"
            title="About Winamp — double-click to whip the llama"
            aria-label="About Winamp"
            onClick={() => setAboutOpen(true)}
            onDoubleClick={toggleLlama}
          >
            <Icon name="bolt" />
          </button>
        </div>
      )}
    </WindowShell>
  );
}
