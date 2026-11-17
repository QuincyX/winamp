import type { WindowId, VisMode } from './types';

export const MAIN_WIDTH = 275;
export const MAIN_HEIGHT = 116;
export const EQ_WIDTH = 275;
export const EQ_HEIGHT = 116;
export const PLAYLIST_DEFAULT_WIDTH = 275;
export const PLAYLIST_DEFAULT_HEIGHT = 232;
export const PLAYLIST_MIN_WIDTH = 275;
export const PLAYLIST_MIN_HEIGHT = 116;
export const PLAYLIST_TITLE_HEIGHT = 20;
export const TITLE_HEIGHT = 14;
export const TASKBAR_HEIGHT = 30;

/** Portrait phones and small tablets use the single-window mobile shell. */
export const MOBILE_BREAKPOINT = 760;
export const MOBILE_PLAYLIST_WIDTH = 275;
export const MOBILE_PLAYLIST_HEIGHT = 232;

/** The unscaled design canvas the windows live on. */
export const STAGE_WIDTH = 330;
export const STAGE_HEIGHT = 520;

export const EQ_FREQS = [70, 160, 320, 600, 1000, 3000, 6000, 12000, 14000, 16000];
export const EQ_LABELS = ['70', '160', '320', '600', '1K', '3K', '6K', '12K', '14K', '16K'];

export const WINDOW_TITLES: Record<WindowId, string> = {
  main: 'WINAMP',
  equalizer: 'WINAMP EQUALIZER',
  playlist: 'WINAMP PLAYLIST',
};

export const WINDOW_SHORT: Record<WindowId, string> = {
  main: 'WINAMP',
  equalizer: 'EQ',
  playlist: 'PLAYLIST',
};

export const VIS_MODES: VisMode[] = ['spectrum', 'oscilloscope', 'off'];

export const VIS_LABELS: Record<VisMode, string> = {
  spectrum: 'Spectrum analyzer',
  oscilloscope: 'Oscilloscope',
  off: 'Off',
};
