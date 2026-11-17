export type WindowId = 'main' | 'equalizer' | 'playlist';

export type PlaybackStatus = 'stopped' | 'playing' | 'paused';

export type RepeatMode = 'off' | 'all' | 'one';

export type VisMode = 'spectrum' | 'oscilloscope' | 'off';

export type TimeMode = 'elapsed' | 'remaining';

export type SortMode = 'title' | 'filename' | 'duration';

export interface Track {
  id: string;
  url: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  fileName: string;
  source: 'demo' | 'local' | 'user';
  year?: string;
  genre?: string;
}

export interface WindowState {
  open: boolean;
  shade: boolean;
  x: number;
  y: number;
}

export interface WindowsState {
  main: WindowState;
  equalizer: WindowState;
  playlist: WindowState;
}

export interface PersistedSettings {
  volume: number;
  balance: number;
  eqEnabled: boolean;
  eqAuto: boolean;
  eqPreset: string;
  preamp: number;
  bands: number[];
  shuffle: boolean;
  repeat: RepeatMode;
  visMode: VisMode;
  timeMode: TimeMode;
  scale: number;
  windows: WindowsState;
  playlistWidth: number;
  playlistHeight: number;
}
