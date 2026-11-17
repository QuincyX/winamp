import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { formatClock, formatLongClock, totalDuration, trackLabel } from '../lib/format';
import { DEFAULT_TRACKS } from '../lib/defaultTracks';
import { MOBILE_PLAYLIST_HEIGHT, MOBILE_PLAYLIST_WIDTH } from '../lib/constants';
import { usePlayerStore } from '../store/playerStore';
import { useMenu, item, separator, header } from './Menu';
import { useUi } from '../ui/UiContext';
import { usePlaylistResize } from '../hooks/useWindowDrag';
import { WindowShell } from './WindowShell';
import { TitleBar } from './TitleBar';
import { Visualizer } from './Visualizer';
import { MiniTransport } from './MiniTransport';

interface ScrollMetrics {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

function PlaylistFooter(): ReactNode {
  const { openFiles, openFolder } = useUi();
  const openMenu = useMenu().openMenu;
  const tracks = usePlayerStore((state) => state.tracks);
  const selectedIds = usePlayerStore((state) => state.selectedIds);
  const setSelected = usePlayerStore((state) => state.setSelected);
  const removeSelected = usePlayerStore((state) => state.removeSelected);
  const cropToSelection = usePlayerStore((state) => state.cropToSelection);
  const removeAll = usePlayerStore((state) => state.removeAll);
  const selectAll = usePlayerStore((state) => state.selectAll);
  const selectNone = usePlayerStore((state) => state.selectNone);
  const sortTracks = usePlayerStore((state) => state.sortTracks);
  const randomizeTracks = usePlayerStore((state) => state.randomizeTracks);
  const reverseTracks = usePlayerStore((state) => state.reverseTracks);
  const addTracks = usePlayerStore((state) => state.addTracks);
  const flash = usePlayerStore((state) => state.flash);
  const elapsed = usePlayerStore((state) => state.elapsed);
  const total = totalDuration(tracks);
  const remaining = Math.max(0, total - elapsed);
  const remainingLabel = `-${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(
    Math.floor(remaining % 60),
  ).padStart(2, '0')}`;

  const menuFrom = (target: HTMLElement, entries: Parameters<typeof openMenu>[2]): void => {
    const rect = target.getBoundingClientRect();
    openMenu(rect.left, rect.top - 2, entries);
  };

  const restoreDefaultPlaylist = (): void => {
    const existing = new Set(tracks.map((track) => track.id));
    const missing = DEFAULT_TRACKS.filter((track) => !existing.has(track.id));
    if (!missing.length) {
      flash('DEFAULT PLAYLIST ALREADY LOADED');
      return;
    }
    addTracks(missing, false);
    flash('DEFAULT PLAYLIST RESTORED');
  };

  const invertSelection = (): void => {
    const selected = new Set(selectedIds);
    setSelected(tracks.filter((track) => !selected.has(track.id)).map((track) => track.id));
  };

  return (
    <div className="playlist-footer">
      <button
        type="button"
        className="pl-action pl-action--add"
        title="Add tracks"
        onClick={(event) =>
          menuFrom(event.currentTarget, [
            header('ADD'),
            item('Add file(s)...', openFiles, { shortcut: 'L' }),
            item('Add folder...', openFolder),
            separator(),
            item('Restore default playlist', restoreDefaultPlaylist),
          ])
        }
      >
        <span className="pl-action__sign">+</span>
        <span>ADD</span>
      </button>
      <button
        type="button"
        className="pl-action pl-action--remove"
        title="Remove tracks"
        onClick={(event) =>
          menuFrom(event.currentTarget, [
            header('REMOVE'),
            item('Remove selected', removeSelected, { disabled: !selectedIds.length }),
            item('Crop to selected', cropToSelection, { disabled: !selectedIds.length }),
            separator(),
            item('Remove all', removeAll, { disabled: !tracks.length }),
          ])
        }
      >
        <span className="pl-action__sign">-</span>
        <span>REM</span>
      </button>
      <button
        type="button"
        className="pl-action pl-action--select"
        title="Selection"
        onClick={(event) =>
          menuFrom(event.currentTarget, [
            header('SELECT'),
            item('Select all', selectAll, { shortcut: 'Ctrl+A' }),
            item('Select none', selectNone),
            item('Invert selection', invertSelection),
          ])
        }
      >
        <span>SEL</span>
      </button>
      <button
        type="button"
        className="pl-action pl-action--misc"
        title="Miscellaneous options"
        onClick={(event) =>
          menuFrom(event.currentTarget, [
            header('MISC OPTIONS'),
            item('Sort by title', () => sortTracks('title')),
            item('Sort by filename', () => sortTracks('filename')),
            item('Sort by duration', () => sortTracks('duration')),
            separator(),
            item('Randomize', randomizeTracks),
            item('Reverse', reverseTracks),
            item('Select all', selectAll),
          ])
        }
      >
        <span>MISC</span>
      </button>

      <div className="playlist-viz">
        <PlaylistMiniVisualizer />
      </div>

      <div className="playlist-runtime">
        <span className="playlist-runtime__line">
          {formatClock(elapsed)}/{formatLongClock(total)}
        </span>
        <span className="playlist-runtime__line playlist-runtime__line--remain">
          {remainingLabel}
        </span>
      </div>

      <MiniTransport className="mini-transport--playlist" />

      <button
        type="button"
        className="pl-load-list"
        title="Playlist options"
        onClick={(event) =>
          menuFrom(event.currentTarget, [
            header('PLAYLIST OPTIONS'),
            item('Add file(s)...', openFiles, { shortcut: 'L' }),
            item('Restore default playlist', restoreDefaultPlaylist),
            separator(),
            item('Sort by title', () => sortTracks('title')),
            item('Sort by filename', () => sortTracks('filename')),
            separator(),
            item('Randomize', randomizeTracks),
            item('Reverse', reverseTracks),
          ])
        }
      >
        <span>LIST</span>
        <span>OPTS</span>
      </button>
    </div>
  );
}

function PlaylistMiniVisualizer(): ReactNode {
  const mainOpen = usePlayerStore((state) => state.windows.main.open);
  const visMode = usePlayerStore((state) => state.visMode);
  return (
    <Visualizer
      mode={mainOpen ? 'off' : visMode}
      width={72}
      height={34}
      title={mainOpen ? 'Close the main window to see the playlist visualizer' : 'Visualization'}
    />
  );
}

interface PlaylistWindowProps {
  mobile?: boolean;
}

export function PlaylistWindow({ mobile = false }: PlaylistWindowProps): ReactNode {
  const scale = usePlayerStore((state) => state.scale || 1);
  const shade = usePlayerStore((state) => state.windows.playlist.shade);
  const playlistWidth = usePlayerStore((state) => state.playlistWidth);
  const playlistHeight = usePlayerStore((state) => state.playlistHeight);
  const effectiveWidth = mobile ? MOBILE_PLAYLIST_WIDTH : playlistWidth;
  const effectiveHeight = mobile ? MOBILE_PLAYLIST_HEIGHT : playlistHeight;
  const isNarrow = effectiveWidth < 380;
  const tracks = usePlayerStore((state) => state.tracks);
  const currentIndex = usePlayerStore((state) => state.currentIndex);
  const selectedIds = usePlayerStore((state) => state.selectedIds);
  const setSelected = usePlayerStore((state) => state.setSelected);
  const toggleSelected = usePlayerStore((state) => state.toggleSelected);
  const playIndex = usePlayerStore((state) => state.playIndex);
  const removeSelected = usePlayerStore((state) => state.removeSelected);
  const elapsed = usePlayerStore((state) => state.elapsed);
  const openMenu = useMenu().openMenu;
  const listRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<number | null>(null);
  const [metrics, setMetrics] = useState<ScrollMetrics>({ scrollTop: 0, scrollHeight: 0, clientHeight: 0 });
  const { onPointerDown: onResizePointerDown } = usePlaylistResize(scale);

  const currentTrack = tracks[currentIndex];

  const updateMetrics = useCallback(() => {
    const element = listRef.current;
    if (!element) return;
    setMetrics({
      scrollTop: element.scrollTop,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    });
  }, []);

  useEffect(() => {
    updateMetrics();
  }, [tracks.length, effectiveHeight, effectiveWidth, updateMetrics]);

  useEffect(() => {
    if (shade) return;
    const element = listRef.current;
    if (!element) return;
    const row = element.querySelector<HTMLElement>(`[data-index="${currentIndex}"]`);
    const rowTop = row?.offsetTop ?? currentIndex * 13;
    const rowHeight = row?.offsetHeight ?? 13;
    if (rowTop < element.scrollTop || rowTop + rowHeight > element.scrollTop + element.clientHeight) {
      element.scrollTop = Math.max(0, rowTop - element.clientHeight + rowHeight * 2);
      updateMetrics();
    }
  }, [currentIndex, shade, updateMetrics]);

  const handleRowClick = (event: ReactMouseEvent<HTMLDivElement>, index: number, id: string): void => {
    if (event.shiftKey && anchorRef.current !== null) {
      const start = Math.min(anchorRef.current, index);
      const end = Math.max(anchorRef.current, index);
      setSelected(tracks.slice(start, end + 1).map((track) => track.id));
      return;
    }
    if (event.ctrlKey || event.metaKey) {
      toggleSelected(id);
      anchorRef.current = index;
      return;
    }
    setSelected([id]);
    anchorRef.current = index;
  };

  const playRow = (index: number): void => {
    playIndex(index, true);
    setSelected([tracks[index].id]);
  };

  const scrollBy = (delta: number): void => {
    if (!listRef.current) return;
    listRef.current.scrollTop += delta;
    updateMetrics();
  };

  const pageScroll = (event: ReactMouseEvent<HTMLDivElement>): void => {
    const element = listRef.current;
    const track = event.currentTarget.getBoundingClientRect();
    if (!element || track.height === 0) return;
    const ratio = (event.clientY - track.top) / track.height;
    element.scrollTop = ratio * element.scrollHeight - element.clientHeight / 2;
    updateMetrics();
  };

  const dragThumb = (event: ReactMouseEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    const element = listRef.current;
    const track = (event.currentTarget.parentElement as HTMLElement | null)?.getBoundingClientRect();
    if (!element || !track) return;
    const startY = event.clientY;
    const startScroll = element.scrollTop;
    const maxScroll = Math.max(1, element.scrollHeight - element.clientHeight);
    const onMove = (moveEvent: PointerEvent): void => {
      const delta = ((moveEvent.clientY - startY) / Math.max(1, track.height)) * maxScroll;
      element.scrollTop = Math.max(0, Math.min(maxScroll, startScroll + delta));
      updateMetrics();
    };
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const ratio = metrics.scrollHeight > 0 ? metrics.clientHeight / metrics.scrollHeight : 1;
  const showScrollbar = metrics.scrollHeight > metrics.clientHeight + 1;
  const thumbHeight = Math.max(16, ratio * 100);
  const maxScroll = Math.max(1, metrics.scrollHeight - metrics.clientHeight);
  const thumbTop = showScrollbar ? (metrics.scrollTop / maxScroll) * (100 - thumbHeight) : 0;

  const shadeContent = shade ? (
    <div className="playlist-shade">
      <span className="playlist-shade__title" title={trackLabel(currentTrack)}>
        {currentTrack ? trackLabel(currentTrack) : 'PLAYLIST EMPTY'}
      </span>
      <span className="playlist-shade__time">{formatClock(elapsed)}</span>
    </div>
  ) : undefined;

  return (
    <WindowShell
      id="playlist"
      width={effectiveWidth}
      height={shade ? 20 : effectiveHeight}
      className={`playlist-window${isNarrow ? ' is-narrow' : ''}`}
    >
      <TitleBar
        id="playlist"
        title="WINAMP PLAYLIST"
        scale={scale}
        showShade
        showClose
        shade={shade}
        shadeContent={shadeContent}
        variant="playlist"
      />
      {!shade && (
        <div className="playlist-body">
          <div
            className="playlist-list"
            ref={listRef}
            onScroll={updateMetrics}
          >
            {tracks.length === 0 ? (
              <div className="playlist-empty">
                <span>PLAYLIST IS EMPTY</span>
                <span>DROP FILES HERE OR PRESS + FILE</span>
              </div>
            ) : (
              tracks.map((track, index) => {
                const selected = selectedIds.includes(track.id);
                return (
                  <div
                    key={track.id}
                    className={`track-row${index === currentIndex ? ' is-current' : ''}${
                      selected ? ' is-selected' : ''
                    }`}
                    data-index={index}
                    onPointerDown={(event) => {
                      if (event.button === 0) handleRowClick(event, index, track.id);
                    }}
                    onDoubleClick={() => playRow(index)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (!selectedIds.includes(track.id)) setSelected([track.id]);
                      openMenu(event.clientX, event.clientY, [
                        header('PLAYLIST ENTRY'),
                        item('Play', () => playRow(index), { shortcut: 'ENTER' }),
                        separator(),
                        item('Remove selected', removeSelected),
                        item('Select all', () => usePlayerStore.getState().selectAll()),
                        separator(),
                        item('Sort by title', () => usePlayerStore.getState().sortTracks('title')),
                      ]);
                    }}
                  >
                    <span className="track-row__number">{index + 1}.</span>
                    <span className="track-row__title" title={trackLabel(track)}>
                      {trackLabel(track)}
                    </span>
                    <span className="track-row__time">{formatClock(track.duration)}</span>
                  </div>
                );
              })
            )}
          </div>

          <div className="playlist-scrollbar">
            <button type="button" className="scroll-arrow scroll-arrow--up" title="Scroll up" onClick={() => scrollBy(-39)}>
              <span />
            </button>
            <div className="scroll-track" onPointerDown={pageScroll}>
              {showScrollbar && (
                <div
                  className="scroll-thumb"
                  style={{ top: `${thumbTop}%`, height: `${thumbHeight}%` }}
                  onPointerDown={dragThumb}
                />
              )}
            </div>
            <button
              type="button"
              className="scroll-arrow scroll-arrow--down"
              title="Scroll down"
              onClick={() => scrollBy(39)}
            >
              <span />
            </button>
          </div>

          <PlaylistFooter />

          {!mobile && (
            <button
              type="button"
              className="playlist-resize"
              title="Resize playlist"
              aria-label="Resize playlist"
              onPointerDown={onResizePointerDown}
            >
              <span />
              <span />
              <span />
            </button>
          )}
        </div>
      )}
    </WindowShell>
  );
}
