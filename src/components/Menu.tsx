import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type MenuEntry =
  | { kind: 'separator' }
  | { kind: 'header'; label: string }
  | {
      kind: 'item';
      label: string;
      shortcut?: string;
      checked?: boolean;
      disabled?: boolean;
      onSelect?: () => void;
      submenu?: MenuEntry[];
    };

export const separator = (): MenuEntry => ({ kind: 'separator' });
export const header = (label: string): MenuEntry => ({ kind: 'header', label });
export const item = (
  label: string,
  onSelect: () => void,
  extra: Omit<Extract<MenuEntry, { kind: 'item' }>, 'kind' | 'label' | 'onSelect'> = {},
): MenuEntry => ({ kind: 'item', label, onSelect, ...extra });
export const submenu = (
  label: string,
  entries: MenuEntry[],
  extra: Omit<Extract<MenuEntry, { kind: 'item' }>, 'kind' | 'label' | 'submenu'> = {},
): MenuEntry => ({ kind: 'item', label, submenu: entries, ...extra });

interface MenuContextValue {
  openMenu: (x: number, y: number, entries: MenuEntry[]) => void;
  closeMenu: () => void;
}

const MenuContext = createContext<MenuContextValue | null>(null);

interface MenuListProps {
  x: number;
  y: number;
  entries: MenuEntry[];
  onClose: () => void;
  onSelect: (entry: Extract<MenuEntry, { kind: 'item' }>) => void;
  depth?: number;
}

function MenuList({ x, y, entries, onClose, onSelect, depth = 0 }: MenuListProps): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });
  const [openSub, setOpenSub] = useState<{ entries: MenuEntry[]; x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const margin = 4;
    let left = x;
    let top = y;
    if (left + rect.width > window.innerWidth - margin) left = window.innerWidth - rect.width - margin;
    if (top + rect.height > window.innerHeight - margin) top = window.innerHeight - rect.height - margin;
    setPosition({ left: Math.max(margin, left), top: Math.max(margin, top) });
  }, [x, y, entries.length]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent): void => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="winamp-menu"
      style={{ left: position.left, top: position.top, zIndex: 9000 + depth * 10 }}
      onPointerDown={(event) => event.stopPropagation()}
      role="menu"
    >
      {entries.map((entry, index) => {
        if (entry.kind === 'separator') {
          return <div key={`sep-${index}`} className="winamp-menu__separator" />;
        }
        if (entry.kind === 'header') {
          return (
            <div key={`header-${index}`} className="winamp-menu__header">
              {entry.label}
            </div>
          );
        }
        const hasSubmenu = Boolean(entry.submenu?.length);
        return (
          <div
            key={`${entry.label}-${index}`}
            className={`winamp-menu__item${entry.disabled ? ' is-disabled' : ''}${
              openSub && openSub.entries === entry.submenu ? ' is-open' : ''
            }`}
            role="menuitem"
            aria-disabled={entry.disabled}
            onPointerEnter={(event) => {
              if (entry.disabled) {
                setOpenSub(null);
                return;
              }
              if (entry.submenu?.length) {
                const rect = event.currentTarget.getBoundingClientRect();
                setOpenSub({ entries: entry.submenu, x: rect.right - 2, y: rect.top - 3 });
              } else {
                setOpenSub(null);
              }
            }}
            onPointerLeave={() => {
              if (hasSubmenu) return;
            }}
            onClick={(event) => {
              event.stopPropagation();
              if (entry.disabled) return;
              if (entry.submenu?.length) return;
              onSelect(entry);
            }}
          >
            <span className="winamp-menu__check">{entry.checked ? '✓' : ''}</span>
            <span className="winamp-menu__label">{entry.label}</span>
            {entry.shortcut && <span className="winamp-menu__shortcut">{entry.shortcut}</span>}
            {hasSubmenu && <span className="winamp-menu__arrow">▸</span>}
            {hasSubmenu && openSub && (
              <MenuList
                x={openSub.x}
                y={openSub.y}
                entries={openSub.entries}
                onClose={onClose}
                onSelect={onSelect}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function MenuProvider({ children }: { children: ReactNode }): ReactNode {
  const [menu, setMenu] = useState<{ x: number; y: number; entries: MenuEntry[] } | null>(null);

  const closeMenu = useCallback(() => setMenu(null), []);
  const openMenu = useCallback((x: number, y: number, entries: MenuEntry[]) => {
    setMenu({ x, y, entries });
  }, []);

  return (
    <MenuContext.Provider value={{ openMenu, closeMenu }}>
      {children}
      {menu &&
        createPortal(
          <MenuList
            x={menu.x}
            y={menu.y}
            entries={menu.entries}
            onClose={closeMenu}
            onSelect={(entry) => {
              entry.onSelect?.();
              closeMenu();
            }}
          />,
          document.body,
        )}
    </MenuContext.Provider>
  );
}

export function useMenu(): MenuContextValue {
  const context = useContext(MenuContext);
  if (!context) throw new Error('useMenu must be used inside a MenuProvider');
  return context;
}
