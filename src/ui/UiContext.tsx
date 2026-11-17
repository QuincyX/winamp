import { createContext, useContext } from 'react';

export interface UiActions {
  openFiles: () => void;
  openFolder: () => void;
  showAbout: () => void;
}

export const UiContext = createContext<UiActions | null>(null);

export function useUi(): UiActions {
  const context = useContext(UiContext);
  if (!context) throw new Error('useUi must be used inside a UiContext provider');
  return context;
}
