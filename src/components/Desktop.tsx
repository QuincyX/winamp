import type { ReactNode } from 'react';
import { STAGE_HEIGHT, STAGE_WIDTH } from '../lib/constants';
import { usePlayerStore } from '../store/playerStore';
import { useMainMenu } from '../menus/mainMenu';
import { MainWindow } from './MainWindow';
import { EqualizerWindow } from './EqualizerWindow';
import { PlaylistWindow } from './PlaylistWindow';

export function Desktop(): ReactNode {
  const scale = usePlayerStore((state) => state.scale || 1);
  const openMainMenu = useMainMenu();

  return (
    <main
      className="desktop"
      onContextMenu={(event) => {
        event.preventDefault();
        openMainMenu(event.clientX, event.clientY);
      }}
    >
      <div className="desktop__wallpaper" aria-hidden="true">
        <span className="desktop__glow desktop__glow--one" />
        <span className="desktop__glow desktop__glow--two" />
        <span className="desktop__grid" />
      </div>

      <div className="desktop__brand" aria-hidden="true">
        <span className="desktop__brand-mark">WINAMP 2.91</span>
        <span className="desktop__brand-sub">HTML5 RECREATION · 2000s DESKTOP</span>
      </div>

      <div className="desktop__hint">
        <span>拖放 MP3 到这里 · 双击列表播放 · 右键打开菜单</span>
        <span>DROP AUDIO FILES · DOUBLE-CLICK TO PLAY · RIGHT-CLICK FOR MENUS</span>
      </div>

      <div className="stage-wrap">
        <div
          className="stage"
          style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT, transform: `scale(${scale})` }}
          data-scale={scale}
        >
          <MainWindow />
          <EqualizerWindow />
          <PlaylistWindow />
        </div>
      </div>
    </main>
  );
}
