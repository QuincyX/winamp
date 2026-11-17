import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { ACCEPTED_AUDIO, usePlayerStore } from './store/playerStore';
import { engine } from './audio/engine';
import { useAudioElement, useEngineSync } from './hooks/useAudioElement';
import { usePersistSettings } from './hooks/usePersistSettings';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useIsMobile } from './hooks/useIsMobile';
import { MenuProvider } from './components/Menu';
import { UiContext } from './ui/UiContext';
import type { UiActions } from './ui/UiContext';
import { Desktop } from './components/Desktop';
import { MobileDesktop } from './components/MobileDesktop';
import { Taskbar } from './components/Taskbar';
import { AboutWindow } from './components/AboutWindow';
import { DropOverlay } from './components/DropOverlay';
import { STAGE_HEIGHT, STAGE_WIDTH, TASKBAR_HEIGHT } from './lib/constants';

export default function App(): ReactNode {
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragActive, setDragActive] = useState(false);
  const isMobile = useIsMobile();

  const addFiles = usePlayerStore((state) => state.addFiles);
  const flash = usePlayerStore((state) => state.flash);
  const aboutOpen = usePlayerStore((state) => state.aboutOpen);
  const setAboutOpen = usePlayerStore((state) => state.setAboutOpen);
  const scale = usePlayerStore((state) => state.scale);
  const status = usePlayerStore((state) => state.status);
  const tracks = usePlayerStore((state) => state.tracks);
  const currentIndex = usePlayerStore((state) => state.currentIndex);

  useAudioElement(audioRef);
  useEngineSync();
  usePersistSettings();

  useEffect(() => {
    folderInputRef.current?.setAttribute('webkitdirectory', '');
    folderInputRef.current?.setAttribute('directory', '');
  }, []);

  // Preload the selected track's metadata so the seek bar and duration are
  // usable before the first play. The autoplay effect below starts it when the
  // browser allows it.
  useEffect(() => {
    const element = audioRef.current;
    const track = tracks[currentIndex];
    if (!element || !track) return;
    if (!element.getAttribute('src')) {
      element.src = track.url;
      element.load();
    }
  }, [tracks, currentIndex]);

  // Autoplay the first track once the element has a source. Browsers may reject
  // this until the site has user activation; the one-shot gesture listener below
  // then starts playback on the first tap/key press.
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const state = usePlayerStore.getState();
      if (state.status === 'stopped' && state.tracks.length > 0) {
        state.playIndex(0, true);
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    let consumed = false;
    const startOnFirstGesture = (): void => {
      if (consumed) return;
      consumed = true;
      engine.ensure();
      const state = usePlayerStore.getState();
      if (state.status !== 'playing') {
        state.play();
      }
      window.removeEventListener('pointerdown', startOnFirstGesture, true);
      window.removeEventListener('keydown', startOnFirstGesture, true);
    };
    window.addEventListener('pointerdown', startOnFirstGesture, true);
    window.addEventListener('keydown', startOnFirstGesture, true);
    return () => {
      window.removeEventListener('pointerdown', startOnFirstGesture, true);
      window.removeEventListener('keydown', startOnFirstGesture, true);
    };
  }, []);

  // Pick a sensible default size for the first visit. 1x, 1.5x and 2x all keep
  // the pixel art crisp because the whole stage is scaled as one unit.
  useEffect(() => {
    if (scale !== 0 || isMobile) return;
    const availableWidth = window.innerWidth - 72;
    const availableHeight = window.innerHeight - TASKBAR_HEIGHT - 72;
    const fit = Math.min(availableWidth / STAGE_WIDTH, availableHeight / STAGE_HEIGHT);
    const preferred = fit >= 1.95 ? 2 : fit >= 1.4 ? 1.5 : fit >= 0.95 ? 1 : Math.max(0.4, Math.floor(fit * 20) / 20);
    usePlayerStore.getState().setScale(preferred);
  }, [scale, isMobile]);

  const openFiles = useCallback((): void => {
    audioInputRef.current?.click();
  }, []);

  const openFolder = useCallback((): void => {
    folderInputRef.current?.click();
  }, []);

  const showAbout = useCallback((): void => {
    setAboutOpen(true);
  }, [setAboutOpen]);

  useKeyboardShortcuts(openFiles);

  const uiActions = useMemo<UiActions>(
    () => ({ openFiles, openFolder, showAbout }),
    [openFiles, openFolder, showAbout],
  );

  const handleInput = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const files = Array.from(event.currentTarget.files ?? []);
      event.currentTarget.value = '';
      if (files.length) void addFiles(files, true);
    },
    [addFiles],
  );

  useEffect(() => {
    const onDragEnter = (event: globalThis.DragEvent): void => {
      if (!Array.from(event.dataTransfer?.types ?? []).includes('Files')) return;
      event.preventDefault();
      dragDepth.current += 1;
      setDragActive(true);
    };
    const onDragOver = (event: globalThis.DragEvent): void => {
      if (!Array.from(event.dataTransfer?.types ?? []).includes('Files')) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    };
    const onDragLeave = (event: globalThis.DragEvent): void => {
      event.preventDefault();
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragActive(false);
    };
    const onDrop = (event: globalThis.DragEvent): void => {
      event.preventDefault();
      dragDepth.current = 0;
      setDragActive(false);
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (files.length) {
        void addFiles(files, true);
      } else {
        flash('NO AUDIO FILES DETECTED');
      }
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [addFiles, flash]);

  const currentTrack = tracks[currentIndex];

  useEffect(() => {
    document.title = currentTrack
      ? `${currentTrack.artist ? `${currentTrack.artist} - ` : ''}${currentTrack.title} · WINAMP 2.91`
      : 'WINAMP 2.91 · HTML5 复刻版';
  }, [currentTrack]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const session = navigator.mediaSession;
    if (currentTrack && typeof MediaMetadata !== 'undefined') {
      session.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist || 'Unknown artist',
        album: currentTrack.album || 'Winamp 2.91',
      });
    }
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => usePlayerStore.getState().play()],
      ['pause', () => usePlayerStore.getState().pause()],
      ['stop', () => usePlayerStore.getState().stop()],
      ['previoustrack', () => usePlayerStore.getState().previous()],
      ['nexttrack', () => usePlayerStore.getState().next()],
      ['seekbackward', () => usePlayerStore.getState().seekBy(-10)],
      ['seekforward', () => usePlayerStore.getState().seekBy(10)],
    ];
    handlers.forEach(([action, handler]) => {
      try {
        session.setActionHandler(action, handler);
      } catch {
        // Some actions are not supported by every browser.
      }
    });
    return () => {
      handlers.forEach(([action]) => {
        try {
          session.setActionHandler(action, null);
        } catch {
          // ignore
        }
      });
    };
  }, [currentTrack]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = status === 'playing' ? 'playing' : status === 'paused' ? 'paused' : 'none';
  }, [status]);

  return (
    <div className="app">
      <audio ref={audioRef} className="audio-engine" preload="metadata" />

      <MenuProvider>
        <UiContext.Provider value={uiActions}>
          {isMobile ? (
            <MobileDesktop />
          ) : (
            <>
              <Desktop />
              <Taskbar />
            </>
          )}
          {aboutOpen && <AboutWindow />}
        </UiContext.Provider>
      </MenuProvider>

      {dragActive && <DropOverlay />}

      <input
        ref={audioInputRef}
        type="file"
        accept={ACCEPTED_AUDIO}
        multiple
        className="hidden-input"
        onChange={handleInput}
      />
      <input
        ref={folderInputRef}
        type="file"
        accept={ACCEPTED_AUDIO}
        multiple
        className="hidden-input"
        onChange={handleInput}
      />

    </div>
  );
}
