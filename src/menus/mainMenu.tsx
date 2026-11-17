import { useCallback } from 'react';
import { EQ_PRESETS } from '../lib/presets';
import type { MenuEntry } from '../components/Menu';
import { header, item, separator, submenu, useMenu } from '../components/Menu';
import { usePlayerStore } from '../store/playerStore';
import { useUi } from '../ui/UiContext';

export function usePresetEntries(): () => MenuEntry[] {
  return useCallback(() => {
    const state = usePlayerStore.getState();
    return EQ_PRESETS.map((preset) =>
      item(
        preset.name,
        () => usePlayerStore.getState().applyPreset(preset.name),
        { checked: state.eqPreset === preset.name },
      ),
    );
  }, []);
}

export function useMainMenu(): (x: number, y: number) => void {
  const { openMenu } = useMenu();
  const { openFiles, openFolder, showAbout } = useUi();
  const presetEntries = usePresetEntries();

  return useCallback(
    (x: number, y: number) => {
      const state = usePlayerStore.getState();
      const entries: MenuEntry[] = [
        header('WINAMP 2.91'),
        item('Play', () => state.play(), { shortcut: 'X' }),
        item('Pause', () => state.pause(), { shortcut: 'C' }),
        item('Stop', () => state.stop(), { shortcut: 'V' }),
        item('Next track', () => state.next(), { shortcut: 'B' }),
        item('Previous track', () => state.previous(), { shortcut: 'Z' }),
        separator(),
        item('Open file(s)...', openFiles, { shortcut: 'L' }),
        item('Open folder...', openFolder),
        separator(),
        submenu('Options', [
          item(
            state.timeMode === 'elapsed' ? 'Time display: elapsed' : 'Time display: remaining',
            () => usePlayerStore.getState().toggleTimeMode(),
            { shortcut: 'T' },
          ),
          item(
            state.scale >= 2 ? 'Double size' : 'Normal size',
            () => usePlayerStore.getState().toggleDoubleSize(),
            { shortcut: 'Ctrl+D', checked: state.scale >= 2 },
          ),
          item('Always on top', () => usePlayerStore.getState().toggleAlwaysOnTop(), {
            shortcut: 'A',
            checked: state.alwaysOnTop,
          }),
          separator(),
          submenu('Visualization', [
            item('Spectrum analyzer', () => usePlayerStore.getState().setVisMode('spectrum'), {
              checked: state.visMode === 'spectrum',
            }),
            item('Oscilloscope', () => usePlayerStore.getState().setVisMode('oscilloscope'), {
              checked: state.visMode === 'oscilloscope',
            }),
            item('Off', () => usePlayerStore.getState().setVisMode('off'), {
              checked: state.visMode === 'off',
            }),
          ]),
          submenu('Interface size', [
            item('100%', () => usePlayerStore.getState().setScale(1), { checked: state.scale === 1 }),
            item('150%', () => usePlayerStore.getState().setScale(1.5), { checked: state.scale === 1.5 }),
            item('200%', () => usePlayerStore.getState().setScale(2), { checked: state.scale === 2 }),
          ]),
          submenu('Equalizer', [
            item('EQ on', () => usePlayerStore.getState().setEqEnabled(true), { checked: state.eqEnabled }),
            item('EQ off', () => usePlayerStore.getState().setEqEnabled(false), { checked: !state.eqEnabled }),
            separator(),
            item('Auto preamp', () => usePlayerStore.getState().toggleEqAuto(), { checked: state.eqAuto }),
            separator(),
            submenu('Presets', presetEntries()),
          ]),
          separator(),
          item('Shuffle', () => usePlayerStore.getState().toggleShuffle(), {
            shortcut: 'S',
            checked: state.shuffle,
          }),
          item('Repeat', () => usePlayerStore.getState().cycleRepeat(), {
            shortcut: 'R',
            checked: state.repeat !== 'off',
          }),
        ]),
        submenu('View', [
          item('Main window', () => usePlayerStore.getState().toggleTaskbarWindow('main'), {
            checked: state.windows.main.open,
          }),
          item('Equalizer', () => usePlayerStore.getState().toggleTaskbarWindow('equalizer'), {
            checked: state.windows.equalizer.open,
          }),
          item('Playlist editor', () => usePlayerStore.getState().toggleTaskbarWindow('playlist'), {
            checked: state.windows.playlist.open,
          }),
          separator(),
          item('Double size', () => usePlayerStore.getState().toggleDoubleSize(), {
            shortcut: 'Ctrl+D',
            checked: state.scale >= 2,
          }),
        ]),
        submenu('Playlist', [
          item('Add file(s)...', openFiles),
          item('Add folder...', openFolder),
          item('Remove all', () => usePlayerStore.getState().removeAll()),
          separator(),
          item('Select all', () => usePlayerStore.getState().selectAll(), { shortcut: 'Ctrl+A' }),
          item('Sort by title', () => usePlayerStore.getState().sortTracks('title')),
          item('Randomize', () => usePlayerStore.getState().randomizeTracks()),
        ]),
        separator(),
        item('About Winamp...', showAbout, { shortcut: 'F1' }),
        item('Keyboard shortcuts...', showAbout),
        separator(),
        item('Exit Winamp', () => {
          usePlayerStore.getState().stop();
          usePlayerStore.getState().closeWindow('playlist');
          usePlayerStore.getState().closeWindow('equalizer');
          usePlayerStore.getState().closeWindow('main');
        }),
      ];

      openMenu(x, y, entries);
    },
    [openFolder, openFiles, openMenu, presetEntries, showAbout],
  );
}

