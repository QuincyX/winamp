/**
 * The built-in equalizer presets from Winamp 2.x.  Raw values are 0..63 with
 * 33 as the neutral point; we convert them to the -12..+12 dB range used by the
 * Web Audio biquad filters.
 */
export interface EqPreset {
  name: string;
  preamp: number;
  bands: number[];
}

const toDb = (raw: number): number => Math.round((raw - 33) * 0.4 * 10) / 10;

const preset = (name: string, raw: number[], preamp = 33): EqPreset => ({
  name,
  preamp: toDb(preamp),
  bands: raw.map(toDb),
});

export const EQ_PRESETS: EqPreset[] = [
  { name: 'Flat', preamp: 0, bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  preset('Classical', [33, 33, 33, 33, 33, 33, 20, 20, 20, 16]),
  preset('Club', [33, 33, 38, 42, 42, 42, 38, 33, 33, 33]),
  preset('Dance', [48, 44, 36, 32, 32, 22, 20, 20, 32, 32]),
  preset('Full Bass', [48, 48, 48, 42, 35, 25, 18, 15, 14, 14]),
  preset('Full Bass & Treble', [44, 42, 33, 20, 24, 35, 46, 50, 52, 52]),
  preset('Full Treble', [16, 16, 16, 25, 37, 50, 58, 58, 58, 60]),
  preset('Laptop speakers/headphones', [40, 50, 41, 26, 28, 35, 40, 48, 53, 56]),
  preset('Large hall', [49, 49, 42, 42, 33, 24, 24, 24, 33, 33]),
  preset('Live', [24, 33, 39, 41, 42, 42, 39, 37, 37, 36]),
  preset('Party', [44, 44, 33, 33, 33, 33, 33, 33, 44, 44]),
  preset('Pop', [29, 40, 44, 45, 41, 30, 28, 28, 29, 29]),
  preset('Reggae', [33, 33, 31, 22, 33, 43, 43, 33, 33, 33]),
  preset('Rock', [45, 40, 23, 19, 26, 39, 47, 50, 50, 50]),
  preset('Ska', [28, 24, 25, 31, 39, 42, 47, 48, 50, 48]),
  preset('Soft', [40, 35, 30, 28, 30, 39, 46, 48, 50, 52]),
  preset('Soft Rock', [39, 39, 36, 31, 25, 23, 26, 31, 37, 47]),
  preset('Techno', [45, 42, 33, 23, 24, 33, 45, 48, 48, 47]),
];

export const FLAT_BANDS = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

export function findPreset(name: string): EqPreset | undefined {
  return EQ_PRESETS.find((p) => p.name === name);
}
