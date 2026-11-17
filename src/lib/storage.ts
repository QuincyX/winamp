import type { PersistedSettings, RepeatMode, VisMode, WindowsState } from './types';
import { clamp } from './format';

const KEY = 'winamp-291:settings:v2';

const DEFAULT_WINDOWS: WindowsState = {
  main: { open: true, shade: false, x: 28, y: 16 },
  equalizer: { open: true, shade: false, x: 28, y: 140 },
  playlist: { open: true, shade: false, x: 28, y: 264 },
};

export const DEFAULT_SETTINGS: PersistedSettings = {
  volume: 78,
  balance: 0,
  eqEnabled: true,
  eqAuto: true,
  eqPreset: 'Flat',
  preamp: 0,
  bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  shuffle: false,
  repeat: 'off',
  visMode: 'spectrum',
  timeMode: 'elapsed',
  scale: 0,
  windows: DEFAULT_WINDOWS,
  playlistWidth: 275,
  playlistHeight: 232,
};

const REPEAT_MODES: RepeatMode[] = ['off', 'all', 'one'];
const VIS_MODES: VisMode[] = ['spectrum', 'oscilloscope', 'off'];

function num(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? clamp(value, min, max) : fallback;
}

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

export function sanitizeSettings(input: unknown): PersistedSettings {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const rawWindows = (raw.windows && typeof raw.windows === 'object' ? raw.windows : {}) as Record<
    string,
    Record<string, unknown>
  >;
  const windows = { ...DEFAULT_WINDOWS };
  (['main', 'equalizer', 'playlist'] as const).forEach((id) => {
    const source = rawWindows[id];
    if (!source) return;
    windows[id] = {
      open: typeof source.open === 'boolean' ? source.open : windows[id].open,
      shade: typeof source.shade === 'boolean' ? source.shade : windows[id].shade,
      x: num(source.x, windows[id].x, -400, 1400),
      y: num(source.y, windows[id].y, -40, 900),
    };
  });

  const bands = Array.isArray(raw.bands) && raw.bands.length === 10
    ? raw.bands.map((band) => num(band, 0, -12, 12))
    : DEFAULT_SETTINGS.bands.slice();

  return {
    volume: num(raw.volume, DEFAULT_SETTINGS.volume, 0, 100),
    balance: num(raw.balance, DEFAULT_SETTINGS.balance, -100, 100),
    eqEnabled: typeof raw.eqEnabled === 'boolean' ? raw.eqEnabled : DEFAULT_SETTINGS.eqEnabled,
    eqAuto: typeof raw.eqAuto === 'boolean' ? raw.eqAuto : DEFAULT_SETTINGS.eqAuto,
    eqPreset: str(raw.eqPreset, DEFAULT_SETTINGS.eqPreset),
    preamp: num(raw.preamp, DEFAULT_SETTINGS.preamp, -12, 12),
    bands,
    shuffle: typeof raw.shuffle === 'boolean' ? raw.shuffle : DEFAULT_SETTINGS.shuffle,
    repeat: REPEAT_MODES.includes(raw.repeat as RepeatMode)
      ? (raw.repeat as RepeatMode)
      : DEFAULT_SETTINGS.repeat,
    visMode: VIS_MODES.includes(raw.visMode as VisMode)
      ? (raw.visMode as VisMode)
      : DEFAULT_SETTINGS.visMode,
    timeMode: raw.timeMode === 'remaining' ? 'remaining' : 'elapsed',
    scale: typeof raw.scale === 'number' && raw.scale >= 0.4 && raw.scale <= 2 ? raw.scale : 0,
    windows,
    playlistWidth: num(raw.playlistWidth, DEFAULT_SETTINGS.playlistWidth, 275, 900),
    playlistHeight: num(raw.playlistHeight, DEFAULT_SETTINGS.playlistHeight, 116, 800),
  };
}

export function loadSettings(): PersistedSettings {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

let saveTimer: number | undefined;

export function saveSettings(settings: PersistedSettings): void {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      // Storage may be full or disabled; playback should not care.
    }
  }, 250);
}
