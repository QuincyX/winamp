import type { PointerEvent as ReactPointerEvent } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { EQ_HEIGHT, EQ_WIDTH, MAIN_HEIGHT, MAIN_WIDTH, PLAYLIST_MIN_HEIGHT, PLAYLIST_MIN_WIDTH, TASKBAR_HEIGHT } from '../lib/constants';
import { isMobileViewport } from '../lib/viewport';
import type { WindowId } from '../lib/types';
import { clamp } from '../lib/format';

interface Dimensions {
  width: number;
  height: number;
}

export function windowDimensions(id: WindowId): Dimensions {
  const state = usePlayerStore.getState();
  if (id === 'playlist') {
    return {
      width: state.playlistWidth,
      height: state.windows.playlist.shade ? 20 : state.playlistHeight,
    };
  }
  return {
    width: id === 'main' ? MAIN_WIDTH : EQ_WIDTH,
    height: state.windows[id].shade ? 14 : id === 'main' ? MAIN_HEIGHT : EQ_HEIGHT,
  };
}

interface SnapResult {
  x: number;
  y: number;
}

function snapPosition(id: WindowId, x: number, y: number, width: number, height: number): SnapResult {
  const state = usePlayerStore.getState();
  const threshold = 8;
  let bestX = threshold + 0.01;
  let bestY = threshold + 0.01;
  let snappedX = x;
  let snappedY = y;

  (['main', 'equalizer', 'playlist'] as WindowId[]).forEach((otherId) => {
    if (otherId === id || !state.windows[otherId].open) return;
    const other = state.windows[otherId];
    const otherDims = windowDimensions(otherId);
    const xCandidates = [other.x - width, other.x + otherDims.width, other.x, other.x + otherDims.width - width];
    const yCandidates = [other.y - height, other.y + otherDims.height, other.y, other.y + otherDims.height - height];
    xCandidates.forEach((candidate) => {
      const delta = Math.abs(candidate - x);
      if (delta < bestX) {
        bestX = delta;
        snappedX = candidate;
      }
    });
    yCandidates.forEach((candidate) => {
      const delta = Math.abs(candidate - y);
      if (delta < bestY) {
        bestY = delta;
        snappedY = candidate;
      }
    });
  });

  const stage = document.querySelector('.stage')?.getBoundingClientRect();
  const stageLeft = stage?.left ?? 0;
  const stageTop = stage?.top ?? 0;
  const rightLimit = (window.innerWidth - 90 - stageLeft) / usePlayerStore.getState().scale;
  const bottomLimit =
    (window.innerHeight - TASKBAR_HEIGHT - 34 - stageTop) / usePlayerStore.getState().scale;

  return {
    x: clamp(snappedX, -width + 90, Math.max(-width + 90, rightLimit)),
    y: clamp(snappedY, -8, Math.max(-8, bottomLimit)),
  };
}

export function useWindowDrag(id: WindowId, scale: number): {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
} {
  const onPointerDown = (event: ReactPointerEvent<HTMLElement>): void => {
    if (isMobileViewport() || event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('button, input, [data-no-drag]')) return;

    event.preventDefault();
    usePlayerStore.getState().focusWindow(id);
    const state = usePlayerStore.getState();
    const origin = state.windows[id];
    const startX = event.clientX;
    const startY = event.clientY;
    const dims = windowDimensions(id);
    let moved = false;

    const onMove = (moveEvent: PointerEvent): void => {
      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 1.5) return;
      moved = true;
      const snapped = snapPosition(id, origin.x + dx, origin.y + dy, dims.width, dims.height);
      usePlayerStore.getState().moveWindow(id, Math.round(snapped.x), Math.round(snapped.y));
    };

    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  return { onPointerDown };
}

export function usePlaylistResize(scale: number): {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  resizing: boolean;
} {
  const onPointerDown = (event: ReactPointerEvent<HTMLElement>): void => {
    if (isMobileViewport() || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const state = usePlayerStore.getState();
    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = state.playlistWidth;
    const startHeight = state.playlistHeight;
    usePlayerStore.getState().focusWindow('playlist');

    const onMove = (moveEvent: PointerEvent): void => {
      // Keep the title bar controls inside the viewport while resizing.
      const stage = document.querySelector('.stage')?.getBoundingClientRect();
      const stageLeft = stage?.left ?? 0;
      const stageTop = stage?.top ?? 0;
      const current = usePlayerStore.getState();
      const maxWidth = Math.max(
        PLAYLIST_MIN_WIDTH,
        (window.innerWidth - 16 - stageLeft) / scale - current.windows.playlist.x,
      );
      const maxHeight = Math.max(
        PLAYLIST_MIN_HEIGHT,
        (window.innerHeight - TASKBAR_HEIGHT - 16 - stageTop) / scale - current.windows.playlist.y,
      );
      const width = clamp(startWidth + (moveEvent.clientX - startX) / scale, PLAYLIST_MIN_WIDTH, Math.min(900, maxWidth));
      const height = clamp(startHeight + (moveEvent.clientY - startY) / scale, PLAYLIST_MIN_HEIGHT, Math.min(800, maxHeight));
      usePlayerStore.getState().setPlaylistSize(Math.round(width), Math.round(height));
    };
    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  return { onPointerDown, resizing: false };
}
