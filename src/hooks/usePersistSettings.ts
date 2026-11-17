import { useEffect } from 'react';
import type { PersistedSettings } from '../lib/types';
import { saveSettings } from '../lib/storage';
import { persistCurrentSettings, usePlayerStore } from '../store/playerStore';

function snapshot(): PersistedSettings {
  const state = usePlayerStore.getState();
  return {
    volume: state.volume,
    balance: state.balance,
    eqEnabled: state.eqEnabled,
    eqAuto: state.eqAuto,
    eqPreset: state.eqPreset,
    preamp: state.preamp,
    bands: state.bands,
    shuffle: state.shuffle,
    repeat: state.repeat,
    visMode: state.visMode,
    timeMode: state.timeMode,
    scale: state.scale,
    windows: state.windows,
    playlistWidth: state.playlistWidth,
    playlistHeight: state.playlistHeight,
  };
}

/** Persists the durable parts of the session (not the playlist / playback position). */
export function usePersistSettings(): void {
  useEffect(() => {
    let previous = JSON.stringify(snapshot());
    const unsubscribe = usePlayerStore.subscribe(() => {
      const next = snapshot();
      const serialized = JSON.stringify(next);
      if (serialized === previous) return;
      previous = serialized;
      saveSettings(next);
    });
    return () => {
      unsubscribe();
      persistCurrentSettings();
    };
  }, []);
}
