import type { ReactNode } from 'react';

export type IconName =
  | 'previous'
  | 'play'
  | 'pause'
  | 'stop'
  | 'next'
  | 'eject'
  | 'minimize'
  | 'shade'
  | 'close'
  | 'bolt'
  | 'equalizer'
  | 'playlist'
  | 'shuffle'
  | 'repeat'
  | 'llama'
  | 'speaker';

interface IconProps {
  name: IconName;
  className?: string;
}

export function Icon({ name, className }: IconProps): ReactNode {
  switch (name) {
    case 'previous':
      return (
        <svg className={className} viewBox="0 0 23 18" aria-hidden="true" focusable="false">
          <rect x="4.5" y="4" width="2.5" height="10" />
          <path d="M16.5 4 8 9l8.5 5z" />
        </svg>
      );
    case 'play':
      return (
        <svg className={className} viewBox="0 0 23 18" aria-hidden="true" focusable="false">
          <path d="M7 3.6 18 9 7 14.4z" />
        </svg>
      );
    case 'pause':
      return (
        <svg className={className} viewBox="0 0 23 18" aria-hidden="true" focusable="false">
          <rect x="7" y="4" width="3.2" height="10" />
          <rect x="13.2" y="4" width="3.2" height="10" />
        </svg>
      );
    case 'stop':
      return (
        <svg className={className} viewBox="0 0 23 18" aria-hidden="true" focusable="false">
          <rect x="7" y="4.4" width="9.6" height="9.2" />
        </svg>
      );
    case 'next':
      return (
        <svg className={className} viewBox="0 0 23 18" aria-hidden="true" focusable="false">
          <path d="M6.5 4 15 9l-8.5 5z" />
          <rect x="16.5" y="4" width="2.5" height="10" />
        </svg>
      );
    case 'eject':
      return (
        <svg className={className} viewBox="0 0 23 18" aria-hidden="true" focusable="false">
          <path d="M4.2 9.2 11.5 3.4l7.3 5.8z" />
          <rect x="4.6" y="11.4" width="13.8" height="2.4" />
        </svg>
      );
    case 'minimize':
      return (
        <svg className={className} viewBox="0 0 9 9" aria-hidden="true" focusable="false">
          <rect x="2" y="6.5" width="5" height="1.2" />
        </svg>
      );
    case 'shade':
      return (
        <svg className={className} viewBox="0 0 9 9" aria-hidden="true" focusable="false">
          <rect x="2" y="2" width="5" height="2" />
          <rect x="2" y="5.4" width="5" height="2" />
        </svg>
      );
    case 'close':
      return (
        <svg className={className} viewBox="0 0 9 9" aria-hidden="true" focusable="false">
          <path d="M2 2 7 7M7 2 2 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        </svg>
      );
    case 'bolt':
      return (
        <svg className={className} viewBox="0 0 13 15" aria-hidden="true" focusable="false">
          <path d="M8.2 0.4 0.9 8.3h4.4L4.4 14.6l7.7-9.1H7.4z" />
        </svg>
      );
    case 'equalizer':
      return (
        <svg className={className} viewBox="0 0 10 10" aria-hidden="true" focusable="false">
          <rect x="1" y="4" width="2" height="5" />
          <rect x="4" y="1" width="2" height="8" />
          <rect x="7" y="3" width="2" height="6" />
        </svg>
      );
    case 'playlist':
      return (
        <svg className={className} viewBox="0 0 10 10" aria-hidden="true" focusable="false">
          <rect x="1" y="2" width="1.6" height="1.6" />
          <rect x="4" y="2" width="5" height="1.4" />
          <rect x="1" y="4.6" width="1.6" height="1.6" />
          <rect x="4" y="4.6" width="5" height="1.4" />
          <rect x="1" y="7.2" width="1.6" height="1.6" />
          <rect x="4" y="7.2" width="5" height="1.4" />
        </svg>
      );
    case 'shuffle':
      return (
        <svg className={className} viewBox="0 0 10 10" aria-hidden="true" focusable="false">
          <path d="M1 2.2h2.2L8 7.8h1.2M6.9 2.2H9v2.1M1 7.8h2.2L5 5.9M6.9 7.8H9V5.7" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'repeat':
      return (
        <svg className={className} viewBox="0 0 10 10" aria-hidden="true" focusable="false">
          <path d="M2 4.2V3a1 1 0 0 1 1-1h5.2M8.2 6V7a1 1 0 0 1-1 1H2M7 0.8 9.3 2.1 7 3.4M3 9.2 0.7 7.9 3 6.6" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'speaker':
      return (
        <svg className={className} viewBox="0 0 10 10" aria-hidden="true" focusable="false">
          <path d="M1.5 3.6h2L6.5 1.4v7.2L3.5 6.4h-2z" />
          <path d="M8 3.2c.7.4 1.1 1 1.1 1.8S8.7 6.4 8 6.8" stroke="currentColor" strokeWidth="0.9" fill="none" />
        </svg>
      );
    case 'llama':
      return (
        <svg className={className} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
          <g fill="#2a2118">
            <rect x="6" y="13" width="16" height="13" rx="3" />
            <rect x="18" y="5" width="7" height="12" rx="2" />
            <rect x="17" y="5" width="9" height="7" rx="2" />
            <rect x="17" y="1" width="2" height="5" />
            <rect x="24" y="1" width="2" height="5" />
            <rect x="9" y="24" width="3" height="6" />
            <rect x="18" y="24" width="3" height="6" />
            <rect x="4" y="17" width="3" height="5" />
          </g>
          <g fill="#efe6cf">
            <rect x="7.5" y="14.5" width="13" height="10" rx="2" />
            <rect x="19.5" y="6.5" width="4" height="10" rx="1.5" />
            <rect x="18.5" y="6.5" width="7" height="5" rx="1.5" />
            <rect x="17.8" y="2" width="1.4" height="4" />
            <rect x="24.2" y="2" width="1.4" height="4" />
            <rect x="10" y="24.5" width="2.2" height="5" />
            <rect x="19" y="24.5" width="2.2" height="5" />
            <rect x="5" y="18" width="2" height="4" />
            <rect x="24" y="9" width="2.6" height="2.2" />
          </g>
          <rect x="21.6" y="7.6" width="1.2" height="1.2" fill="#2a2118" />
          <rect x="24.6" y="9.4" width="1" height="0.8" fill="#2a2118" />
        </svg>
      );
    default:
      return null;
  }
}
