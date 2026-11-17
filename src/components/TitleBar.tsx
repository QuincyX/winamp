import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { usePlayerStore } from '../store/playerStore';
import type { WindowId } from '../lib/types';
import { useWindowDrag } from '../hooks/useWindowDrag';
import { Icon } from './Icon';

interface TitleBarProps {
  id: WindowId;
  title: string;
  scale: number;
  showMinimize?: boolean;
  showShade?: boolean;
  showClose?: boolean;
  leftSlot?: ReactNode;
  variant?: 'main' | 'equalizer' | 'playlist';
  shade?: boolean;
  shadeContent?: ReactNode;
  llama?: boolean;
}

interface TitleButtonProps {
  label: string;
  icon: 'minimize' | 'shade' | 'close';
  onClick: () => void;
}

function TitleButton({ label, icon, onClick }: TitleButtonProps): ReactNode {
  return (
    <button
      type="button"
      className={`title-bar__button title-bar__button--${icon}`}
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      <Icon name={icon} />
    </button>
  );
}

export function TitleBar({
  id,
  title,
  scale,
  showMinimize = false,
  showShade = true,
  showClose = true,
  leftSlot,
  variant = 'main',
  shade = false,
  shadeContent,
  llama = false,
}: TitleBarProps): ReactNode {
  const focused = usePlayerStore((state) => state.focused === id);
  const toggleShade = usePlayerStore((state) => state.toggleShade);
  const closeWindow = usePlayerStore((state) => state.closeWindow);
  const { onPointerDown } = useWindowDrag(id, scale);

  const handleDoubleClick = (event: ReactMouseEvent<HTMLElement>): void => {
    if ((event.target as HTMLElement).closest('button')) return;
    toggleShade(id);
  };

  const displayedTitle = llama && id === 'main' ? "IT REALLY WHIPS THE LLAMA'S ASS!" : title;

  return (
    <header
      className={`title-bar title-bar--${variant}${focused ? ' is-focused' : ''}${
        shade ? ' is-shade' : ''
      }${llama && id === 'main' ? ' is-llama' : ''}`}
      onPointerDown={onPointerDown}
      onDoubleClick={handleDoubleClick}
    >
      {leftSlot}
      {shade && shadeContent ? (
        <div className="title-bar__shade-content">{shadeContent}</div>
      ) : (
        <>
          <span className="title-bar__rule" aria-hidden="true" />
          <span className="title-bar__title" title={displayedTitle}>
            {displayedTitle}
          </span>
          <span className="title-bar__rule" aria-hidden="true" />
        </>
      )}
      <div className="title-bar__buttons">
        {showMinimize && (
          <TitleButton label="Minimize" icon="minimize" onClick={() => closeWindow(id)} />
        )}
        {showShade && (
          <TitleButton
            label={shade ? 'Restore' : 'Window shade'}
            icon="shade"
            onClick={() => toggleShade(id)}
          />
        )}
        {showClose && <TitleButton label="Close" icon="close" onClick={() => closeWindow(id)} />}
      </div>
    </header>
  );
}
