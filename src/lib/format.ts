import type { Track } from './types';

export interface TimeParts {
  minutesFirst: string;
  minutesSecond: string;
  secondsFirst: string;
  secondsSecond: string;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds + 1e-6);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function formatLongClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const total = Math.floor(seconds + 1e-6);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function timeParts(seconds: number, hideLeadingMinute = true): TimeParts {
  const total = Math.max(0, Math.min(5999, Math.floor(seconds + 1e-6)));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  const minutesFirst = minutes >= 10 ? String(Math.floor(minutes / 10)) : hideLeadingMinute ? '' : '0';
  return {
    minutesFirst,
    minutesSecond: String(minutes % 10),
    secondsFirst: String(Math.floor(secs / 10)),
    secondsSecond: String(secs % 10),
  };
}

export function formatKbps(bitrate?: number): string {
  if (!bitrate || !Number.isFinite(bitrate)) return '';
  return String(Math.round(bitrate)).slice(0, 3);
}

export function formatKhz(sampleRate?: number): string {
  if (!sampleRate || !Number.isFinite(sampleRate)) return '';
  return String(Math.round(sampleRate / 1000)).slice(0, 2);
}

export function trackLabel(track: Track | undefined): string {
  if (!track) return '';
  return track.artist ? `${track.artist} - ${track.title}` : track.title;
}

export function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.[a-z0-9]{1,5}$/i, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function fileNameFromUrl(url: string): string {
  try {
    const parsed = new URL(url, window.location.href);
    return decodeURIComponent(parsed.pathname.split('/').pop() || '');
  } catch {
    return url;
  }
}

export function totalDuration(tracks: Track[]): number {
  return tracks.reduce((sum, track) => sum + (Number.isFinite(track.duration) ? track.duration : 0), 0);
}
