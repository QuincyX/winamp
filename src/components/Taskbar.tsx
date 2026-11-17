import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { WindowId } from '../lib/types';
import { usePlayerStore } from '../store/playerStore';
import { useMainMenu } from '../menus/mainMenu';
import { Icon } from './Icon';

function useClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 10_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

const TASKS: { id: WindowId; label: string; icon: 'bolt' | 'equalizer' | 'playlist' }[] = [
  { id: 'main', label: 'WINAMP', icon: 'bolt' },
  { id: 'equalizer', label: 'EQUALIZER', icon: 'equalizer' },
  { id: 'playlist', label: 'PLAYLIST', icon: 'playlist' },
];

export function Taskbar(): ReactNode {
  const openMainMenu = useMainMenu();
  const windows = usePlayerStore((state) => state.windows);
  const focused = usePlayerStore((state) => state.focused);
  const toggleTaskbarWindow = usePlayerStore((state) => state.toggleTaskbarWindow);
  const setScale = usePlayerStore((state) => state.setScale);
  const setAboutOpen = usePlayerStore((state) => state.setAboutOpen);
  const scale = usePlayerStore((state) => state.scale || 1);
  const now = useClock();

  const clock = useMemo(
    () =>
      new Intl.DateTimeFormat('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(now),
    [now],
  );
  const date = useMemo(
    () =>
      new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now),
    [now],
  );

  const cycleScale = (): void => {
    const next = scale >= 2 ? 1 : scale >= 1.5 ? 2 : 1.5;
    setScale(next);
  };

  return (
    <div className="taskbar" role="toolbar" aria-label="Desktop taskbar">
      <button
        type="button"
        className="taskbar__start"
        title="Winamp menu"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          openMainMenu(rect.left, rect.top - 6);
        }}
      >
        <span className="taskbar__start-icon">
          <Icon name="bolt" />
        </span>
        <span>Winamp</span>
      </button>

      <div className="taskbar__divider" />

      <div className="taskbar__tasks">
        {TASKS.map((task) => {
          const isOpen = windows[task.id].open;
          const isActive = isOpen && focused === task.id;
          return (
            <button
              key={task.id}
              type="button"
              className={`taskbar__task${isOpen ? ' is-open' : ' is-closed'}${
                isActive ? ' is-active' : ''
              }`}
              title={`${isOpen ? 'Focus' : 'Open'} ${task.label}`}
              onClick={() => toggleTaskbarWindow(task.id)}
            >
              <Icon name={task.icon} />
              <span>{task.label}</span>
            </button>
          );
        })}
      </div>

      <div className="taskbar__tray">
        <button
          type="button"
          className="taskbar__zoom"
          title="Interface scale"
          onClick={cycleScale}
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          type="button"
          className="taskbar__help"
          title="About & keyboard shortcuts (F1)"
          onClick={() => setAboutOpen(true)}
        >
          ?
        </button>
        <div className="taskbar__clock" title={date}>
          <span>{clock}</span>
          <span className="taskbar__date">{date}</span>
        </div>
      </div>
    </div>
  );
}
