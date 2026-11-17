import { titleFromFilename } from '../lib/format';

export interface AudioProbe {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  genre?: string;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  duration?: number;
}

const latin1 = new TextDecoder('iso-8859-1');
const utf8 = new TextDecoder('utf-8');
const utf16 = new TextDecoder('utf-16');
const utf16be = new TextDecoder('utf-16be');

function ascii(bytes: Uint8Array, start: number, length: number): string {
  let out = '';
  for (let i = start; i < start + length; i += 1) {
    const code = bytes[i];
    if (code === undefined || code === 0) break;
    out += String.fromCharCode(code);
  }
  return out;
}

function readU32(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] << 24) >>> 0) + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3];
}

function syncSafe(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] & 0x7f) << 21) |
    ((bytes[offset + 1] & 0x7f) << 14) |
    ((bytes[offset + 2] & 0x7f) << 7) |
    (bytes[offset + 3] & 0x7f)
  );
}

function decodeTextFrame(payload: Uint8Array): string {
  if (payload.length === 0) return '';
  const encoding = payload[0];
  const body = payload.subarray(1);
  let text: string;
  switch (encoding) {
    case 0:
      text = latin1.decode(body);
      break;
    case 1:
      text = utf16.decode(body);
      break;
    case 2:
      text = utf16be.decode(body);
      break;
    case 3:
      text = utf8.decode(body);
      break;
    default:
      text = latin1.decode(body);
  }
  return text.replace(/\u0000+$/g, '').replace(/\uFEFF/g, '').trim();
}

interface Id3Result {
  tags: Record<string, string>;
  audioStart: number;
}

function parseId3(bytes: Uint8Array): Id3Result {
  const tags: Record<string, string> = {};
  if (bytes.length < 10 || ascii(bytes, 0, 3) !== 'ID3') {
    return { tags, audioStart: 0 };
  }
  const major = bytes[3];
  const flags = bytes[5];
  const tagSize = syncSafe(bytes, 6);
  const audioStart = 10 + tagSize + (flags & 0x10 ? 10 : 0);
  const end = Math.min(bytes.length, 10 + tagSize);
  let pos = 10 + (flags & 0x10 ? 10 : 0);

  const want = new Set(['TIT2', 'TPE1', 'TALB', 'TYER', 'TDRC', 'TCON', 'TLEN', 'TT2', 'TP1', 'TAL', 'TYE', 'TCO']);

  while (pos < end) {
    let id: string;
    let frameSize: number;
    let headerSize: number;
    if (major === 2) {
      if (pos + 6 > end) break;
      id = ascii(bytes, pos, 3);
      frameSize = (bytes[pos + 3] << 16) + (bytes[pos + 4] << 8) + bytes[pos + 5];
      headerSize = 6;
    } else {
      if (pos + 10 > end) break;
      id = ascii(bytes, pos, 4);
      frameSize = major === 4 ? syncSafe(bytes, pos + 4) : readU32(bytes, pos + 4);
      headerSize = 10;
    }
    if (!/^[A-Z0-9]{3,4}$/.test(id) || frameSize <= 0) break;
    const dataStart = pos + headerSize;
    const dataEnd = Math.min(end, dataStart + frameSize);
    if (dataStart >= dataEnd) break;
    if (want.has(id)) {
      const key = id === 'TT2' ? 'TIT2' : id === 'TP1' ? 'TPE1' : id === 'TAL' ? 'TALB' : id === 'TYE' ? 'TYER' : id === 'TCO' ? 'TCON' : id;
      tags[key] = decodeTextFrame(bytes.subarray(dataStart, dataEnd));
    }
    pos = dataStart + frameSize;
  }
  return { tags, audioStart };
}

interface Mp3Info {
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
}

const MP3_BITRATES: Record<string, number[]> = {
  '1-1': [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  '1-2': [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
  '1-3': [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
  '2-1': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  '2-2': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  '2-3': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};

const SAMPLE_RATES: Record<number, number[]> = {
  3: [44100, 48000, 32000],
  2: [22050, 24000, 16000],
  0: [11025, 12000, 8000],
};

function parseMp3Header(bytes: Uint8Array, offset: number): Mp3Info | null {
  if (offset + 4 > bytes.length) return null;
  if (bytes[offset] !== 0xff || (bytes[offset + 1] & 0xe0) !== 0xe0) return null;
  const versionBits = (bytes[offset + 1] >> 3) & 0x03;
  const layerBits = (bytes[offset + 1] >> 1) & 0x03;
  if (versionBits === 1 || layerBits === 0) return null;
  const bitrateIndex = (bytes[offset + 2] >> 4) & 0x0f;
  const sampleRateIndex = (bytes[offset + 2] >> 2) & 0x03;
  if (bitrateIndex === 0 || bitrateIndex === 15 || sampleRateIndex === 3) return null;

  const tableVersion = versionBits === 3 ? '1' : '2';
  const tableLayer = layerBits === 3 ? '3' : layerBits === 2 ? '2' : '1';
  const bitrate = MP3_BITRATES[`${tableVersion}-${tableLayer}`]?.[bitrateIndex];
  const sampleRate = SAMPLE_RATES[versionBits]?.[sampleRateIndex];
  if (!bitrate || !sampleRate) return null;
  const channelMode = (bytes[offset + 3] >> 6) & 0x03;
  return {
    bitrate,
    sampleRate,
    channels: channelMode === 3 ? 1 : 2,
  };
}

function findMp3Frame(bytes: Uint8Array, start: number): Mp3Info | null {
  const end = Math.min(bytes.length - 4, start + 240_000);
  for (let i = Math.max(0, start); i < end; i += 1) {
    if (bytes[i] === 0xff && (bytes[i + 1] & 0xe0) === 0xe0) {
      const info = parseMp3Header(bytes, i);
      if (info) return info;
    }
  }
  return null;
}

interface WavInfo extends Mp3Info {
  duration?: number;
}

function parseWav(bytes: Uint8Array): WavInfo | null {
  if (bytes.length < 44) return null;
  if (ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WAVE') return null;
  let pos = 12;
  let channels: number | undefined;
  let sampleRate: number | undefined;
  let byteRate: number | undefined;
  let dataSize: number | undefined;
  while (pos + 8 <= bytes.length) {
    const id = ascii(bytes, pos, 4);
    const size = bytes[pos + 4] | (bytes[pos + 5] << 8) | (bytes[pos + 6] << 16) | (bytes[pos + 7] << 24);
    const body = pos + 8;
    if (id === 'fmt ' && body + 16 <= bytes.length) {
      channels = bytes[body + 2] | (bytes[body + 3] << 8);
      sampleRate = bytes[body + 4] | (bytes[body + 5] << 8) | (bytes[body + 6] << 16) | (bytes[body + 7] << 24);
      byteRate = bytes[body + 8] | (bytes[body + 9] << 8) | (bytes[body + 10] << 16) | (bytes[body + 11] << 24);
    } else if (id === 'data') {
      dataSize = size >>> 0;
      break;
    }
    pos = body + size + (size & 1);
  }
  return {
    channels,
    sampleRate,
    duration: dataSize && byteRate ? dataSize / byteRate : undefined,
  };
}

function parseId3v1(file: File): Promise<Record<string, string>> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const bytes = new Uint8Array(reader.result as ArrayBuffer);
      if (bytes.length < 128 || ascii(bytes, 0, 3) !== 'TAG') {
        resolve({});
        return;
      }
      const decode = (start: number, length: number): string =>
        latin1.decode(bytes.subarray(start, start + length)).replace(/\u0000+.*$/s, '').trim();
      resolve({
        TIT2: decode(3, 30),
        TPE1: decode(33, 30),
        TALB: decode(63, 30),
        TYER: decode(93, 4),
      });
    };
    reader.onerror = () => resolve({});
    reader.readAsArrayBuffer(file.slice(Math.max(0, file.size - 128)));
  });
}

function readMediaDuration(url: string): Promise<number | undefined> {
  return new Promise((resolve) => {
    const audio = new Audio();
    let done = false;
    const finish = (value?: number) => {
      if (done) return;
      done = true;
      audio.removeAttribute('src');
      audio.load();
      resolve(value && Number.isFinite(value) ? value : undefined);
    };
    const timer = window.setTimeout(() => finish(undefined), 4000);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      window.clearTimeout(timer);
      finish(audio.duration);
    };
    audio.onerror = () => {
      window.clearTimeout(timer);
      finish(undefined);
    };
    audio.src = url;
  });
}

export async function probeAudioFile(file: File, objectUrl: string): Promise<AudioProbe> {
  let bytes = new Uint8Array(0);
  try {
    bytes = new Uint8Array(await file.slice(0, Math.min(file.size, 2 * 1024 * 1024)).arrayBuffer());
  } catch {
    // ignore, we can still fall back to the media element
  }

  const { tags, audioStart } = parseId3(bytes);
  const mp3 = findMp3Frame(bytes, audioStart || 0);
  const wav = parseWav(bytes);
  const id3v1 = Object.keys(tags).length === 0 ? await parseId3v1(file) : {};
  const merged = { ...id3v1, ...tags };

  const bitrate = mp3?.bitrate;
  const duration = wav?.duration ?? (bitrate && file.size > 0 ? (file.size * 8) / (bitrate * 1000) : undefined);
  const probedDuration = duration ?? (await readMediaDuration(objectUrl));

  return {
    title: merged.TIT2 || titleFromFilename(file.name),
    artist: merged.TPE1 || '',
    album: merged.TALB || '',
    year: merged.TYER || merged.TDRC || '',
    genre: merged.TCON || '',
    bitrate: bitrate ?? (wav?.sampleRate ? 1411 : undefined),
    sampleRate: mp3?.sampleRate ?? wav?.sampleRate,
    channels: mp3?.channels ?? wav?.channels,
    duration: probedDuration,
  };
}
