import { create } from 'zustand';
import { engine } from '../audio/engine';
import { getAudioElement } from '../audio/element';
import { probeAudioFile } from '../audio/metadata';
import { DEFAULT_TRACKS } from '../lib/defaultTracks';
import { clamp } from '../lib/format';
import { findPreset } from '../lib/presets';
import { loadSettings, saveSettings } from '../lib/storage';
import type {
  PlaybackStatus,
  RepeatMode,
  SortMode,
  TimeMode,
  Track,
  VisMode,
  WindowId,
  WindowsState,
} from '../lib/types';

const settings = loadSettings();

export const ACCEPTED_AUDIO =
  'audio/*,.mp3,.mp2,.wav,.ogg,.oga,.opus,.flac,.m4a,.aac,.weba,.webm,.mid,.midi';

let transientTimer: ReturnType<typeof setTimeout> | undefined;

function flashText(set: (partial: Partial<PlayerState>) => void, text: string, duration = 1500): void {
  if (transientTimer) clearTimeout(transientTimer);
  set({ transientText: text });
  transientTimer = setTimeout(() => set({ transientText: '' }), duration);
}

function releaseTrack(track: Track): void {
  if (track.source === 'local' && track.url.startsWith('blob:')) {
    URL.revokeObjectURL(track.url);
  }
}

function randomOtherIndex(length: number, current: number): number {
  if (length <= 1) return 0;
  let next = current;
  while (next === current) {
    next = Math.floor(Math.random() * length);
  }
  return next;
}

function pickRepeatNext(repeat: RepeatMode): RepeatMode {
  return repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off';
}

export interface PlayerState {
  tracks: Track[];
  currentIndex: number;
  status: PlaybackStatus;
  elapsed: number;
  duration: number;
  loading: boolean;

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

  windows: WindowsState;
  focused: WindowId;
  zOrder: WindowId[];
  scale: number;
  playlistWidth: number;
  playlistHeight: number;
  alwaysOnTop: boolean;
  llamaMode: boolean;

  selectedIds: string[];
  transientText: string;
  aboutOpen: boolean;

  // Playback
  playIndex: (index: number, autoplay?: boolean) => void;
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number, silent?: boolean) => void;
  seekBy: (delta: number) => void;
  handleEnded: () => void;
  handleAudioTime: (time: number) => void;
  handleDuration: (duration: number) => void;
  handleAudioError: () => void;

  // Library
  addFiles: (files: File[], playFirst?: boolean) => Promise<void>;
  addTracks: (tracks: Track[], playFirst?: boolean) => void;
  updateTrack: (id: string, patch: Partial<Track>) => void;
  removeSelected: () => void;
  cropToSelection: () => void;
  removeAll: () => void;
  sortTracks: (mode: SortMode) => void;
  randomizeTracks: () => void;
  reverseTracks: () => void;

  // Mixer
  setVolume: (value: number) => void;
  setBalance: (value: number) => void;
  setBand: (index: number, value: number) => void;
  setPreamp: (value: number) => void;
  setEqEnabled: (enabled: boolean) => void;
  toggleEq: () => void;
  setEqAuto: (enabled: boolean) => void;
  toggleEqAuto: () => void;
  applyPreset: (name: string) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setVisMode: (mode: VisMode) => void;
  cycleVisMode: () => void;
  toggleTimeMode: () => void;

  // Windows & chrome
  focusWindow: (id: WindowId) => void;
  moveWindow: (id: WindowId, x: number, y: number) => void;
  toggleShade: (id: WindowId) => void;
  setShade: (id: WindowId, shade: boolean) => void;
  closeWindow: (id: WindowId) => void;
  openWindow: (id: WindowId) => void;
  toggleTaskbarWindow: (id: WindowId) => void;
  setPlaylistSize: (width: number, height: number) => void;
  setScale: (scale: number) => void;
  toggleDoubleSize: () => void;
  toggleAlwaysOnTop: () => void;
  toggleLlama: () => void;
  setAboutOpen: (open: boolean) => void;

  // Playlist selection
  setSelected: (ids: string[]) => void;
  toggleSelected: (id: string) => void;
  selectAll: () => void;
  selectNone: () => void;

  flash: (text: string, duration?: number) => void;
}

const initialTrack = DEFAULT_TRACKS[0];

export const usePlayerStore = create<PlayerState>()((set, get) => {
  const startPlayback = (): void => {
    const element = getAudioElement();
    if (!element) return;
    engine.ensure();
    const promise = element.play();
    if (promise) {
      promise.catch(() => {
        set({ status: 'paused' });
      });
    }
  };

  const prepareIndex = (index: number, autoplay: boolean): void => {
    const state = get();
    if (!state.tracks.length) return;
    const safeIndex = clamp(index, 0, state.tracks.length - 1);
    const track = state.tracks[safeIndex];
    const element = getAudioElement();
    if (element) {
      const absolute = new URL(track.url, window.location.href).href;
      if (element.src !== absolute) {
        element.src = track.url;
        element.load();
      }
      try {
        element.currentTime = 0;
      } catch {
        // Some browsers reject seeking before metadata; harmless.
      }
    }
    set({
      currentIndex: safeIndex,
      duration: track.duration || 0,
      elapsed: 0,
      status: autoplay ? 'playing' : 'stopped',
    });
    if (autoplay) startPlayback();
  };

  const endPlayback = (): void => {
    const element = getAudioElement();
    element?.pause();
    if (element) {
      try {
        element.currentTime = 0;
      } catch {
        // ignore
      }
    }
    set({ status: 'stopped', elapsed: 0 });
  };

  return {
    tracks: DEFAULT_TRACKS.slice(),
    currentIndex: 0,
    status: 'stopped',
    elapsed: 0,
    duration: initialTrack?.duration ?? 0,
    loading: false,

    volume: settings.volume,
    balance: settings.balance,

    eqEnabled: settings.eqEnabled,
    eqAuto: settings.eqAuto,
    eqPreset: settings.eqPreset,
    preamp: settings.preamp,
    bands: settings.bands.slice(),

    shuffle: settings.shuffle,
    repeat: settings.repeat,
    visMode: settings.visMode,
    timeMode: settings.timeMode,

    windows: settings.windows,
    focused: 'main',
    zOrder: ['equalizer', 'playlist', 'main'],
    scale: settings.scale,
    playlistWidth: settings.playlistWidth,
    playlistHeight: settings.playlistHeight,
    alwaysOnTop: false,
    llamaMode: false,

    selectedIds: [],
    transientText: '',
    aboutOpen: false,

    playIndex: (index, autoplay = true) => {
      prepareIndex(index, autoplay);
    },

    play: () => {
      const { status, tracks, currentIndex } = get();
      if (!tracks.length) return;
      if (status === 'paused') {
        const element = getAudioElement();
        if (element?.src) {
          engine.ensure();
          const promise = element.play();
          if (promise) promise.catch(() => set({ status: 'paused' }));
          set({ status: 'playing' });
          return;
        }
      }
      prepareIndex(currentIndex, true);
    },

    togglePlay: () => {
      if (get().status === 'playing') {
        get().pause();
      } else {
        get().play();
      }
    },

    pause: () => {
      if (get().status !== 'playing') return;
      getAudioElement()?.pause();
      set({ status: 'paused' });
    },

    stop: () => {
      endPlayback();
    },

    next: () => {
      const { tracks, currentIndex, status, shuffle } = get();
      if (!tracks.length) return;
      const nextIndex = shuffle ? randomOtherIndex(tracks.length, currentIndex) : (currentIndex + 1) % tracks.length;
      prepareIndex(nextIndex, status !== 'stopped');
    },

    previous: () => {
      const { tracks, currentIndex, status, elapsed, shuffle } = get();
      if (!tracks.length) return;
      if (elapsed > 3) {
        get().seek(0);
        return;
      }
      const prevIndex = shuffle
        ? randomOtherIndex(tracks.length, currentIndex)
        : (currentIndex - 1 + tracks.length) % tracks.length;
      prepareIndex(prevIndex, status !== 'stopped');
    },

    seek: (seconds, silent = false) => {
      const { duration } = get();
      const max = duration || get().tracks[get().currentIndex]?.duration || 0;
      const target = clamp(seconds, 0, Math.max(0, max));
      const element = getAudioElement();
      if (element && Number.isFinite(target)) {
        try {
          element.currentTime = target;
        } catch {
          // ignore
        }
      }
      set({ elapsed: target });
      if (get().status === 'stopped' && target > 0 && get().tracks.length) {
        set({ status: 'paused' });
      }
      if (!silent) {
        flashText(set, `SEEK: ${Math.floor(target / 60)}:${String(Math.floor(target % 60)).padStart(2, '0')}`);
      }
    },

    seekBy: (delta) => {
      get().seek(get().elapsed + delta, true);
    },

    handleAudioTime: (time) => {
      set({ elapsed: Number.isFinite(time) ? time : 0 });
    },

    handleDuration: (duration) => {
      const { currentIndex, tracks } = get();
      if (!tracks[currentIndex] || !Number.isFinite(duration) || duration <= 0) return;
      set({ duration });
      set((state) => ({
        tracks: state.tracks.map((track, index) =>
          index === state.currentIndex ? { ...track, duration } : track,
        ),
      }));
    },

    handleAudioError: () => {
      set({ status: 'stopped', elapsed: 0 });
      flashText(set, 'ERROR: CANNOT PLAY FILE');
    },

    handleEnded: () => {
      const { tracks, currentIndex, repeat, shuffle, status } = get();
      if (!tracks.length || status === 'stopped') return;
      if (repeat === 'one') {
        const element = getAudioElement();
        if (element) {
          element.currentTime = 0;
          void element.play();
        }
        set({ elapsed: 0, status: 'playing' });
        return;
      }
      const nextIndex = shuffle ? randomOtherIndex(tracks.length, currentIndex) : currentIndex + 1;
      if (nextIndex >= tracks.length) {
        if (repeat === 'all') {
          prepareIndex(0, true);
        } else {
          endPlayback();
        }
        return;
      }
      prepareIndex(nextIndex, true);
    },

    addFiles: async (files, playFirst = false) => {
      const audioFiles = files.filter(
        (file) =>
          file.type.startsWith('audio/') ||
          /\.(mp3|mp2|wav|ogg|oga|opus|flac|m4a|aac|weba|webm|mid|midi)$/i.test(file.name),
      );
      if (!audioFiles.length) {
        flashText(set, 'NO SUPPORTED AUDIO FILES');
        return;
      }
      set({ loading: true });
      const added: Track[] = [];
      for (const file of audioFiles) {
        const url = URL.createObjectURL(file);
        try {
          const probe = await probeAudioFile(file, url);
          added.push({
            id: globalThis.crypto?.randomUUID?.() ?? `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            url,
            title: probe.title || file.name.replace(/\.[^.]+$/, ''),
            artist: probe.artist || '',
            album: probe.album,
            duration: probe.duration ?? 0,
            bitrate: probe.bitrate,
            sampleRate: probe.sampleRate,
            channels: probe.channels,
            fileName: file.name,
            source: 'local',
            year: probe.year,
            genre: probe.genre,
          });
        } catch {
          URL.revokeObjectURL(url);
        }
      }
      set({ loading: false });
      if (!added.length) {
        flashText(set, 'COULD NOT READ FILES');
        return;
      }
      get().addTracks(added, playFirst);
      flashText(set, `ADDED ${added.length} TRACK${added.length > 1 ? 'S' : ''}`);
    },

    addTracks: (newTracks, playFirst = false) => {
      const state = get();
      const previousCount = state.tracks.length;
      const tracks = [...state.tracks, ...newTracks];
      const firstNewIndex = previousCount;
      if (previousCount === 0) {
        set({ tracks, currentIndex: 0, duration: tracks[0]?.duration ?? 0, elapsed: 0, status: 'stopped' });
        if (playFirst) {
          prepareIndex(0, true);
        } else {
          prepareIndex(0, false);
        }
        return;
      }
      set({ tracks });
      if (playFirst) {
        prepareIndex(firstNewIndex, state.status !== 'stopped');
      }
    },

    updateTrack: (id, patch) => {
      set((state) => ({
        tracks: state.tracks.map((track) => (track.id === id ? { ...track, ...patch } : track)),
        duration:
          state.tracks[state.currentIndex]?.id === id && patch.duration
            ? patch.duration
            : state.duration,
      }));
    },

    removeSelected: () => {
      const state = get();
      if (!state.selectedIds.length) return;
      const remove = new Set(state.selectedIds);
      const currentId = state.tracks[state.currentIndex]?.id;
      const removedCurrent = currentId ? remove.has(currentId) : false;
      const beforeCurrent = state.tracks
        .slice(0, state.currentIndex)
        .filter((track) => remove.has(track.id)).length;
      state.tracks.forEach((track) => {
        if (remove.has(track.id)) releaseTrack(track);
      });
      const tracks = state.tracks.filter((track) => !remove.has(track.id));
      if (!tracks.length) {
        get().removeAll();
        return;
      }
      const nextIndex = clamp(state.currentIndex - beforeCurrent, 0, tracks.length - 1);
      set({
        tracks,
        currentIndex: nextIndex,
        selectedIds: tracks[nextIndex] ? [tracks[nextIndex].id] : [],
      });
      if (removedCurrent) {
        endPlayback();
        prepareIndex(nextIndex, false);
      }
    },

    cropToSelection: () => {
      const state = get();
      if (!state.selectedIds.length) return;
      const keep = new Set(state.selectedIds);
      const currentId = state.tracks[state.currentIndex]?.id;
      const tracks = state.tracks.filter((track) => keep.has(track.id));
      if (!tracks.length) return;
      state.tracks.forEach((track) => {
        if (!keep.has(track.id)) releaseTrack(track);
      });
      const nextIndex = currentId ? tracks.findIndex((track) => track.id === currentId) : 0;
      set({
        tracks,
        currentIndex: nextIndex >= 0 ? nextIndex : 0,
        selectedIds: tracks.map((track) => track.id),
      });
      if (nextIndex < 0) {
        endPlayback();
        prepareIndex(0, false);
      }
      flashText(set, 'PLAYLIST CROPPED');
    },
    removeAll: () => {
      const element = getAudioElement();
      element?.pause();
      if (element) {
        element.removeAttribute('src');
        element.load();
      }
      get().tracks.forEach(releaseTrack);
      set({
        tracks: [],
        currentIndex: -1,
        selectedIds: [],
        status: 'stopped',
        elapsed: 0,
        duration: 0,
        loading: false,
      });
      flashText(set, 'PLAYLIST CLEARED');
    },

    sortTracks: (mode) => {
      const { tracks, currentIndex } = get();
      if (tracks.length < 2) return;
      const currentId = tracks[currentIndex]?.id;
      const sorted = tracks.slice().sort((a, b) => {
        if (mode === 'duration') return a.duration - b.duration;
        if (mode === 'filename') return a.fileName.localeCompare(b.fileName, undefined, { numeric: true });
        return `${a.artist} ${a.title}`.localeCompare(`${b.artist} ${b.title}`, undefined, { numeric: true });
      });
      const nextIndex = currentId ? sorted.findIndex((track) => track.id === currentId) : 0;
      set({ tracks: sorted, currentIndex: nextIndex >= 0 ? nextIndex : 0 });
      flashText(set, `SORTED BY ${mode.toUpperCase()}`);
    },

    randomizeTracks: () => {
      const { tracks, currentIndex } = get();
      if (tracks.length < 2) return;
      const currentId = tracks[currentIndex]?.id;
      const shuffled = tracks.slice();
      for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const nextIndex = currentId ? shuffled.findIndex((track) => track.id === currentId) : 0;
      set({ tracks: shuffled, currentIndex: nextIndex >= 0 ? nextIndex : 0 });
      flashText(set, 'PLAYLIST RANDOMIZED');
    },

    reverseTracks: () => {
      const { tracks, currentIndex } = get();
      if (tracks.length < 2) return;
      const currentId = tracks[currentIndex]?.id;
      const reversed = tracks.slice().reverse();
      const nextIndex = currentId ? reversed.findIndex((track) => track.id === currentId) : 0;
      set({ tracks: reversed, currentIndex: nextIndex >= 0 ? nextIndex : 0 });
      flashText(set, 'PLAYLIST REVERSED');
    },

    setVolume: (value) => {
      set({ volume: clamp(value, 0, 100) });
    },

    setBalance: (value) => {
      set({ balance: clamp(value, -100, 100) });
    },

    setBand: (index, value) => {
      set((state) => {
        const bands = state.bands.slice();
        bands[index] = Math.round(clamp(value, -12, 12) * 2) / 2;
        return { bands, eqPreset: 'Custom' };
      });
    },

    setPreamp: (value) => {
      set({ preamp: Math.round(clamp(value, -12, 12) * 2) / 2, eqPreset: 'Custom' });
    },

    setEqEnabled: (enabled) => {
      set({ eqEnabled: enabled });
      flashText(set, enabled ? 'EQ: ON' : 'EQ: OFF');
    },

    toggleEq: () => {
      get().setEqEnabled(!get().eqEnabled);
    },

    setEqAuto: (enabled) => {
      set({ eqAuto: enabled });
      flashText(set, enabled ? 'AUTO PREAMP: ON' : 'AUTO PREAMP: OFF');
    },

    toggleEqAuto: () => {
      get().setEqAuto(!get().eqAuto);
    },

    applyPreset: (name) => {
      const preset = findPreset(name);
      if (!preset) return;
      set({ bands: preset.bands.slice(), preamp: preset.preamp, eqPreset: preset.name });
      flashText(set, `PRESET: ${preset.name.toUpperCase()}`);
    },

    toggleShuffle: () => {
      set((state) => ({ shuffle: !state.shuffle }));
      flashText(set, get().shuffle ? 'SHUFFLE: ON' : 'SHUFFLE: OFF');
    },

    cycleRepeat: () => {
      const repeat = pickRepeatNext(get().repeat);
      set({ repeat });
      flashText(set, `REPEAT: ${repeat.toUpperCase()}`);
    },

    setVisMode: (mode) => {
      set({ visMode: mode });
      flashText(set, `VIS: ${mode.toUpperCase()}`);
    },

    cycleVisMode: () => {
      const order: VisMode[] = ['spectrum', 'oscilloscope', 'off'];
      const index = order.indexOf(get().visMode);
      get().setVisMode(order[(index + 1) % order.length]);
    },

    toggleTimeMode: () => {
      const timeMode: TimeMode = get().timeMode === 'elapsed' ? 'remaining' : 'elapsed';
      set({ timeMode });
      flashText(set, timeMode === 'elapsed' ? 'TIME: ELAPSED' : 'TIME: REMAINING');
    },

    focusWindow: (id) => {
      set((state) => ({
        focused: id,
        zOrder: [...state.zOrder.filter((windowId) => windowId !== id), id],
      }));
    },

    moveWindow: (id, x, y) => {
      set((state) => ({
        windows: {
          ...state.windows,
          [id]: { ...state.windows[id], x, y },
        },
      }));
    },

    toggleShade: (id) => {
      get().setShade(id, !get().windows[id].shade);
    },

    setShade: (id, shade) => {
      set((state) => ({
        windows: {
          ...state.windows,
          [id]: { ...state.windows[id], shade },
        },
        focused: id,
      }));
    },

    closeWindow: (id) => {
      set((state) => {
        const windows = { ...state.windows, [id]: { ...state.windows[id], open: false } };
        const remaining = state.zOrder.filter((windowId) => windowId !== id && windows[windowId].open);
        return {
          windows,
          focused: state.focused === id ? remaining[remaining.length - 1] ?? 'main' : state.focused,
        };
      });
    },

    openWindow: (id) => {
      set((state) => ({
        windows: { ...state.windows, [id]: { ...state.windows[id], open: true } },
      }));
      get().focusWindow(id);
    },

    toggleTaskbarWindow: (id) => {
      const state = get();
      if (state.windows[id].open && state.focused === id) {
        state.closeWindow(id);
      } else if (state.windows[id].open) {
        state.focusWindow(id);
      } else {
        state.openWindow(id);
      }
    },

    setPlaylistSize: (width, height) => {
      set({ playlistWidth: width, playlistHeight: height });
    },

    setScale: (scale) => {
      set({ scale: clamp(scale, 0.4, 2) });
    },

    toggleDoubleSize: () => {
      const scale = get().scale >= 2 ? 1 : 2;
      set({ scale });
      flashText(set, scale === 2 ? 'DOUBLE SIZE: ON' : 'DOUBLE SIZE: OFF');
    },

    toggleAlwaysOnTop: () => {
      set((state) => ({ alwaysOnTop: !state.alwaysOnTop }));
      flashText(set, get().alwaysOnTop ? 'ALWAYS ON TOP: ON' : 'ALWAYS ON TOP: OFF');
    },

    toggleLlama: () => {
      set((state) => ({ llamaMode: !state.llamaMode }));
      flashText(set, get().llamaMode ? "IT REALLY WHIPS THE LLAMA'S ASS!" : 'WINAMP 2.91', 2600);
    },

    setAboutOpen: (open) => {
      set({ aboutOpen: open });
    },

    setSelected: (ids) => {
      set({ selectedIds: ids });
    },

    toggleSelected: (id) => {
      set((state) => ({
        selectedIds: state.selectedIds.includes(id)
          ? state.selectedIds.filter((selectedId) => selectedId !== id)
          : [...state.selectedIds, id],
      }));
    },

    selectAll: () => {
      set((state) => ({ selectedIds: state.tracks.map((track) => track.id) }));
    },

    selectNone: () => {
      set({ selectedIds: [] });
    },

    flash: (text, duration) => {
      flashText(set, text, duration);
    },
  };
});

export function persistCurrentSettings(): void {
  const state = usePlayerStore.getState();
  saveSettings({
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
  });
}


