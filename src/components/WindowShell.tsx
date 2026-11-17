import type { ReactNode } from 'react';
import { usePlayerStore } from '../store/playerStore';
import type { WindowId } from '../lib/types';

interface WindowShellProps {
  id: WindowId;
  width: number;
  height: number;
  className?: string;
  children: ReactNode;
}

export function WindowShell({ id, width, height, className, children }: WindowShellProps): ReactNode {
  const windowState = usePlayerStore((state) => state.windows[id]);
  const focused = usePlayerStore((state) => state.focused === id);
  const zIndex = usePlayerStore((state) => 20 + state.zOrder.indexOf(id));
  const focusWindow = usePlayerStore((state) => state.focusWindow);

  if (!windowState.open) return null;

  return (
    <section
      className={`winamp-window ${className ?? ''} ${focused ? 'is-focused' : 'is-inactive'}`}
      data-window={id}
      style={{ left: windowState.x, top: windowState.y, width, height, zIndex }}
      onPointerDownCapture={() => focusWindow(id)}
    >
      {children}
    </section>
  );
}
