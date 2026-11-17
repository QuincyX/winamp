import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { LLAMA_WHIP_URL } from '../lib/defaultTracks';
import { usePlayerStore } from '../store/playerStore';
import { Icon } from './Icon';

export function AboutWindow(): ReactNode {
  const open = usePlayerStore((state) => state.aboutOpen);
  const setOpen = usePlayerStore((state) => state.setAboutOpen);
  const toggleLlama = usePlayerStore((state) => state.toggleLlama);
  const llamaMode = usePlayerStore((state) => state.llamaMode);
  const closeRef = useRef<HTMLButtonElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      audioRef.current = null;
    },
    [],
  );

  if (!open) return null;

  const whip = (): void => {
    if (!llamaMode) toggleLlama();
    audioRef.current?.pause();
    const audio = new Audio(LLAMA_WHIP_URL);
    audio.volume = 0.75;
    audioRef.current = audio;
    void audio.play().catch(() => {
      usePlayerStore.getState().flash("THE LLAMA IS SHY — CLICK AGAIN");
    });
  };

  return (
    <div
      className="about-overlay"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
      role="presentation"
    >
      <div className="about-dialog" role="dialog" aria-modal="true" aria-labelledby="about-title">
        <div className="about-titlebar">
          <span className="about-titlebar__icon">
            <Icon name="bolt" />
          </span>
          <span id="about-title" className="about-titlebar__title">
            ABOUT WINAMP
          </span>
          <button
            ref={closeRef}
            type="button"
            className="about-titlebar__close"
            aria-label="Close about dialog"
            onClick={() => setOpen(false)}
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="about-body">
          <div className="about-hero">
            <div className="about-hero__logo">
              <Icon name="bolt" />
            </div>
            <div>
              <h1 className="about-hero__title">WINAMP 2.91</h1>
              <p className="about-hero__subtitle">HTML5 RECREATION · 2000s EDITION</p>
              <p className="about-hero__tagline">“It really whips the llama&apos;s ass!”</p>
            </div>
            <button
              type="button"
              className={`about-llama${llamaMode ? ' is-awake' : ''}`}
              title="Whip the llama"
              aria-label="Whip the llama"
              onClick={whip}
            >
              <Icon name="llama" />
            </button>
          </div>

          <p className="about-copy">
            用 React 19、Vite 与 Web Audio API 复刻的 Winamp 经典皮肤。三扇窗口、10 段均衡器、频谱分析、
            可拖放的播放列表与像素级 LED 时间显示，全部在浏览器里实时绘制。
          </p>

          <div className="about-columns">
            <section className="about-section">
              <h2>WHAT&apos;S INSIDE</h2>
              <ul>
                <li>HTML5 audio + Web Audio 10-band EQ</li>
                <li>Dot-matrix spectrum &amp; oscilloscope</li>
                <li>Draggable, dockable, shade-able windows</li>
                <li>Classic playlist, presets and hot keys</li>
                <li>Three original demo tracks</li>
              </ul>
            </section>
            <section className="about-section">
              <h2>HOT KEYS</h2>
              <ul className="about-keys">
                <li><kbd>X</kbd> play <kbd>C</kbd> pause <kbd>V</kbd> stop</li>
                <li><kbd>B</kbd> next <kbd>Z</kbd> previous <kbd>L</kbd> open</li>
                <li><kbd>←</kbd> <kbd>→</kbd> seek · <kbd>↑</kbd> <kbd>↓</kbd> volume</li>
                <li><kbd>Shift</kbd> + <kbd>←</kbd>/<kbd>→</kbd> balance</li>
                <li><kbd>S</kbd> shuffle <kbd>R</kbd> repeat <kbd>T</kbd> time</li>
                <li><kbd>Ctrl</kbd>+<kbd>D</kbd> double size · <kbd>F1</kbd> help</li>
              </ul>
            </section>
          </div>

          <div className="about-meta">
            <span>React 19 · Vite · Web Audio API · Zustand</span>
            <span>No Nullsoft code or skin bitmaps — all pixels redrawn.</span>
          </div>

          <div className="about-actions">
            <button type="button" className="about-button about-button--whip" onClick={whip}>
              WHIP THE LLAMA
            </button>
            <button type="button" className="about-button" onClick={() => setOpen(false)}>
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
