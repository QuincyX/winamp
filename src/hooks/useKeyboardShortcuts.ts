import { useEffect } from 'react';
import { clamp } from '../lib/format';
import { usePlayerStore } from '../store/playerStore';

export function useKeyboardShortcuts(openFiles: () => void): void {
  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const store = usePlayerStore.getState();
      const key = event.key.toLowerCase();

      if (store.aboutOpen && event.key !== 'Escape') return;

      if (
        target?.closest('[role="slider"]') &&
        ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)
      ) {
        // The focused slider owns these keys; avoid applying the action twice.
        return;
      }

      if (event.ctrlKey || event.metaKey) {
        if (key === 'd') {
          event.preventDefault();
          store.toggleDoubleSize();
        } else if (key === 'o') {
          event.preventDefault();
          openFiles();
        } else if (key === 't') {
          event.preventDefault();
          store.toggleTimeMode();
        } else if (key === 'a') {
          event.preventDefault();
          store.selectAll();
        }
        return;
      }

      switch (event.key) {
        case 'F1':
          event.preventDefault();
          store.setAboutOpen(true);
          return;
        case 'Escape':
          store.setAboutOpen(false);
          return;
        case 'Delete':
        case 'Backspace':
          event.preventDefault();
          store.removeSelected();
          return;
        case 'ArrowLeft':
          event.preventDefault();
          if (event.shiftKey) {
            const balance = clamp(store.balance - 5, -100, 100);
            store.setBalance(balance);
            store.flash(`BALANCE: ${Math.abs(balance)}% ${balance < 0 ? 'LEFT' : balance > 0 ? 'RIGHT' : 'CENTER'}`);
          } else {
            store.seekBy(-5);
          }
          return;
        case 'ArrowRight':
          event.preventDefault();
          if (event.shiftKey) {
            const balance = clamp(store.balance + 5, -100, 100);
            store.setBalance(balance);
            store.flash(`BALANCE: ${Math.abs(balance)}% ${balance < 0 ? 'LEFT' : balance > 0 ? 'RIGHT' : 'CENTER'}`);
          } else {
            store.seekBy(5);
          }
          return;
        case 'ArrowUp':
          event.preventDefault();
          store.setVolume(clamp(store.volume + 5, 0, 100));
          store.flash(`VOLUME: ${store.volume}%`);
          return;
        case 'ArrowDown':
          event.preventDefault();
          store.setVolume(clamp(store.volume - 5, 0, 100));
          store.flash(`VOLUME: ${store.volume}%`);
          return;
        default:
          break;
      }

      switch (key) {
        case 'x':
          store.play();
          break;
        case 'c':
          store.pause();
          break;
        case 'v':
          store.stop();
          break;
        case 'b':
          store.next();
          break;
        case 'z':
          store.previous();
          break;
        case 'l':
          openFiles();
          break;
        case 'r':
          store.cycleRepeat();
          break;
        case 's':
          store.toggleShuffle();
          break;
        case 't':
          store.toggleTimeMode();
          break;
        case 'd':
          store.toggleDoubleSize();
          break;
        case ' ':
          if (target?.closest('button')) return;
          event.preventDefault();
          store.togglePlay();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [openFiles]);
}
