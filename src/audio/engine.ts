import { EQ_FREQS } from '../lib/constants';

const dbToGain = (db: number): number => (db === 0 ? 1 : 10 ** (db / 20));

/**
 * The Web Audio graph:
 *
 *   <audio> -> preamp -> 10 x peaking biquad -> balance -> master -> analyser -> out
 *
 * The graph is created lazily on the first user gesture so browsers do not
 * reject a suspended AudioContext.
 */
export class AudioEngine {
  private context: AudioContext | null = null;
  private element: HTMLAudioElement | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private preampNode: GainNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private panner: StereoPannerNode | null = null;
  private master: GainNode | null = null;
  analyser: AnalyserNode | null = null;

  private pending = {
    volume: 78,
    balance: 0,
    bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    preamp: 0,
    eqEnabled: false,
    eqAuto: true,
  };

  attach(element: HTMLAudioElement | null): void {
    this.element = element;
    if (this.context && element && !this.source) {
      this.connectSource();
    }
  }

  /** Must be called from a user gesture the first time. */
  ensure(): AudioContext | null {
    if (!this.context) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      const context = new Ctor({ latencyHint: 'interactive' });
      this.context = context;

      this.preampNode = context.createGain();
      this.panner = context.createStereoPanner();
      this.master = context.createGain();
      this.analyser = context.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.72;
      this.analyser.minDecibels = -92;
      this.analyser.maxDecibels = -12;

      let node: AudioNode = this.preampNode;
      this.filters = EQ_FREQS.map((frequency, index) => {
        const filter = context.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = frequency;
        filter.Q.value = index === 0 || index === EQ_FREQS.length - 1 ? 0.9 : 1.2;
        filter.gain.value = 0;
        node.connect(filter);
        node = filter;
        return filter;
      });
      node.connect(this.panner);
      this.panner.connect(this.master);
      this.master.connect(this.analyser);
      this.analyser.connect(context.destination);

      this.connectSource();
      this.applyAll(true);
    }

    if (this.context.state === 'suspended') {
      void this.context.resume();
    }
    return this.context;
  }

  private connectSource(): void {
    const context = this.context;
    const element = this.element;
    if (!context || !element || this.source) return;
    try {
      this.source = context.createMediaElementSource(element);
      if (this.preampNode) {
        this.source.connect(this.preampNode);
      }
    } catch {
      // Element already connected to another context; ignore.
    }
  }

  setVolume(volume: number): void {
    this.pending.volume = volume;
    if (!this.context || !this.master) return;
    const gain = Math.max(0.0001, (volume / 100) ** 1.45);
    this.master.gain.setTargetAtTime(gain, this.context.currentTime, 0.02);
  }

  setBalance(balance: number): void {
    this.pending.balance = balance;
    if (!this.context || !this.panner) return;
    this.panner.pan.setTargetAtTime(Math.max(-1, Math.min(1, balance / 100)), this.context.currentTime, 0.02);
  }

  setEqualizer(bands: number[], preamp: number, enabled: boolean, auto: boolean): void {
    this.pending.bands = bands;
    this.pending.preamp = preamp;
    this.pending.eqEnabled = enabled;
    this.pending.eqAuto = auto;
    if (!this.context) return;
    this.applyAll(false);
  }

  private applyAll(immediate: boolean): void {
    const context = this.context;
    if (!context) return;
    const { bands, preamp, eqEnabled, eqAuto, volume, balance } = this.pending;
    const now = context.currentTime;
    const smoothing = immediate ? 0.0001 : 0.03;

    const maxBoost = Math.max(0, ...bands);
    const autoComp = eqAuto ? -maxBoost * 0.6 : 0;
    const preampDb = eqEnabled ? preamp + autoComp : 0;
    this.preampNode?.gain.setTargetAtTime(dbToGain(preampDb), now, smoothing);

    this.filters.forEach((filter, index) => {
      const gain = eqEnabled ? bands[index] ?? 0 : 0;
      filter.gain.setTargetAtTime(gain, now, smoothing);
    });

    this.panner?.pan.setTargetAtTime(Math.max(-1, Math.min(1, balance / 100)), now, smoothing);
    const gain = Math.max(0.0001, (volume / 100) ** 1.45);
    this.master?.gain.setTargetAtTime(gain, now, smoothing);
  }
}

export const engine = new AudioEngine();
