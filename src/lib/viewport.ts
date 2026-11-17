import { MOBILE_BREAKPOINT } from './constants';

export const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT}px) and (orientation: portrait)`;

/** Imperative check for event handlers (kept in sync with useIsMobile). */
export function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}
