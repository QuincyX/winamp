import type { Track } from './types';

const demoAsset = (file: string): string => `${import.meta.env.BASE_URL}demo/${file}`;

/**
 * Three original tracks, synthesized for this project by scripts/generate_demos.py.
 * They give the player something to play before the visitor drops in their own MP3s.
 */
export const DEMO_TRACKS: Track[] = [
  {
    id: 'demo-neon-skyline',
    url: demoAsset('neon-skyline.mp3'),
    title: 'Neon Skyline',
    artist: 'Nullsoft Replica',
    album: 'Winamp 2.91 · Demo Sessions',
    duration: 91.43,
    bitrate: 128,
    sampleRate: 44100,
    channels: 2,
    fileName: 'neon-skyline.mp3',
    year: '2000',
    genre: 'Synthwave',
    source: 'demo',
  },
  {
    id: 'demo-llama-whippin',
    url: demoAsset('llama-whippin.mp3'),
    title: "Llama Whippin'",
    artist: 'Nullsoft Replica',
    album: 'Winamp 2.91 · Demo Sessions',
    duration: 68.57,
    bitrate: 128,
    sampleRate: 44100,
    channels: 2,
    fileName: 'llama-whippin.mp3',
    year: '2000',
    genre: 'Chiptune',
    source: 'demo',
  },
  {
    id: 'demo-pixel-rain',
    url: demoAsset('pixel-rain.mp3'),
    title: 'Pixel Rain',
    artist: 'Nullsoft Replica',
    album: 'Winamp 2.91 · Demo Sessions',
    duration: 82.29,
    bitrate: 128,
    sampleRate: 44100,
    channels: 2,
    fileName: 'pixel-rain.mp3',
    year: '2000',
    genre: 'Ambient',
    source: 'demo',
  },
];

/** The playlist a fresh installation starts with. */
export const DEFAULT_TRACKS: Track[] = [...DEMO_TRACKS];

export const LLAMA_WHIP_URL = demoAsset('llama-whip.mp3');
