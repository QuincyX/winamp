import { useRef } from 'react';
import type { ReactNode } from 'react';
import { EQ_FREQS, EQ_LABELS } from '../lib/constants';
import { clamp } from '../lib/format';
import { usePlayerStore } from '../store/playerStore';
import { useMenu, header, separator } from './Menu';
import { usePresetEntries } from '../menus/mainMenu';
import { useSlider } from '../hooks/useSlider';
import { WindowShell } from './WindowShell';
import { TitleBar } from './TitleBar';
import { HorizontalSlider } from './HorizontalSlider';

interface EqBandProps {
  index: number | null;
  label: string;
  value: number;
  ariaLabel: string;
  onChange: (value: number) => void;
  onCommit: () => void;
}

function EqBand({ index, label, value, ariaLabel, onChange, onCommit }: EqBandProps): ReactNode {
  const { ref, handlers, dragging } = useSlider({
    value,
    min: -12,
    max: 12,
    step: 0.5,
    orientation: 'vertical',
    onChange,
    onCommit,
  });
  const ratio = (value + 12) / 24;

  return (
    <div
      ref={ref}
      className={`eq-band${index === null ? ' eq-band--preamp' : ''}${dragging ? ' is-dragging' : ''}`}
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={-12}
      aria-valuemax={12}
      aria-valuenow={value}
      title={`${ariaLabel}: ${value > 0 ? '+' : ''}${value.toFixed(1)} dB`}
      {...handlers}
    >
      <div className="eq-band__track" aria-hidden="true" />
      <div className="eq-band__thumb" style={{ bottom: `calc((100% - 13px) * ${ratio})` }} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <span className="eq-band__label">{label}</span>
    </div>
  );
}

interface EqGraphProps {
  bands: number[];
  enabled: boolean;
  onChange: (index: number, value: number) => void;
}

function EqGraph({ bands, enabled, onChange }: EqGraphProps): ReactNode {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const width = 113;
  const height = 19;
  const points = bands.map((band, index) => ({
    x: 6 + index * (width - 12) / 9,
    y: height / 2 - (band / 12) * (height / 2 - 2),
  }));
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');

  const update = (clientX: number, clientY: number): void => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relativeX = clamp((clientX - rect.left) / rect.width, 0, 1);
    const relativeY = clamp((clientY - rect.top) / rect.height, 0, 1);
    const index = clamp(Math.round(relativeX * 9), 0, 9);
    const value = Math.round(((1 - relativeY) * 24 - 12) * 2) / 2;
    onChange(index, value);
  };

  return (
    <svg
      ref={svgRef}
      className={`eq-graph${enabled ? '' : ' is-disabled'}`}
      viewBox={`0 0 ${width} ${height}`}
      aria-label="Equalizer curve — drag to shape it"
      role="application"
      onPointerDown={(event) => {
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        update(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (dragging.current) update(event.clientX, event.clientY);
      }}
      onPointerUp={(event) => {
        dragging.current = false;
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
          // ignore
        }
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
    >
      <rect x="0" y="0" width={width} height={height} className="eq-graph__bg" />
      {[1, 2, 3].map((line) => (
        <line key={line} x1="0" y1={(height / 4) * line} x2={width} y2={(height / 4) * line} className="eq-graph__grid" />
      ))}
      {EQ_LABELS.map((_, index) => (
        <line
          key={index}
          x1={6 + (index * (width - 12)) / 9}
          y1="0"
          x2={6 + (index * (width - 12)) / 9}
          y2={height}
          className="eq-graph__grid eq-graph__grid--vertical"
        />
      ))}
      <path d={path} className="eq-graph__line" />
      {points.map((point, index) => (
        <rect key={index} x={point.x - 1} y={point.y - 1} width="2" height="2" className="eq-graph__dot" />
      ))}
    </svg>
  );
}

export function EqualizerWindow(): ReactNode {
  const scale = usePlayerStore((state) => state.scale || 1);
  const shade = usePlayerStore((state) => state.windows.equalizer.shade);
  const bands = usePlayerStore((state) => state.bands);
  const preamp = usePlayerStore((state) => state.preamp);
  const eqEnabled = usePlayerStore((state) => state.eqEnabled);
  const eqAuto = usePlayerStore((state) => state.eqAuto);
  const setBand = usePlayerStore((state) => state.setBand);
  const setPreamp = usePlayerStore((state) => state.setPreamp);
  const setEqEnabled = usePlayerStore((state) => state.setEqEnabled);
  const toggleEqAuto = usePlayerStore((state) => state.toggleEqAuto);
  const flash = usePlayerStore((state) => state.flash);
  const openMenu = useMenu().openMenu;
  const presetEntries = usePresetEntries();
  const volume = usePlayerStore((state) => state.volume);
  const balance = usePlayerStore((state) => state.balance);
  const setVolume = usePlayerStore((state) => state.setVolume);
  const setBalance = usePlayerStore((state) => state.setBalance);

  const presetsMenu = (target: HTMLElement): void => {
    const rect = target.getBoundingClientRect();
    openMenu(rect.left, rect.bottom + 1, [header('EQUALIZER PRESETS'), ...presetEntries(), separator()]);
  };

  const shadeContent = shade ? (
    <div className="eq-shade">
      <span className="eq-shade__label">VOL</span>
      <HorizontalSlider
        className="eq-shade__vol"
        value={volume}
        min={0}
        max={100}
        ariaLabel="Volume"
        onChange={setVolume}
        onCommit={() => flash(`VOLUME: ${usePlayerStore.getState().volume}%`)}
      />
      <span className="eq-shade__label">BAL</span>
      <HorizontalSlider
        className="eq-shade__bal"
        value={balance}
        min={-100}
        max={100}
        fillFromCenter
        ariaLabel="Balance"
        onChange={setBalance}
        onCommit={() => flash('BALANCE')}
      />
    </div>
  ) : undefined;

  return (
    <WindowShell id="equalizer" width={275} height={shade ? 14 : 116} className="equalizer-window">
      <TitleBar
        id="equalizer"
        title="WINAMP EQUALIZER"
        scale={scale}
        showShade
        showClose
        shade={shade}
        shadeContent={shadeContent}
        variant="equalizer"
      />
      {!shade && (
        <div
          className={`equalizer-body${eqEnabled ? '' : ' is-bypassed'}`}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            presetsMenu(event.currentTarget);
          }}
        >
          <div className={`eq-panel${eqEnabled ? '' : ' is-bypassed'}`} aria-hidden="true">
            <span className="eq-scale eq-scale--plus">+12db</span>
            <span className="eq-scale eq-scale--zero">0db</span>
            <span className="eq-scale eq-scale--minus">-12db</span>
            <div className="eq-gridline eq-gridline--plus" />
            <div className="eq-gridline eq-gridline--zero" />
            <div className="eq-gridline eq-gridline--minus" />
          </div>

          <button
            type="button"
            className={`eq-toggle${eqEnabled ? ' is-on' : ''}`}
            title="Toggle equalizer"
            aria-pressed={eqEnabled}
            onClick={() => setEqEnabled(!eqEnabled)}
          >
            <span className={`led${eqEnabled ? ' is-on' : ''}`} />
            <span>ON</span>
          </button>
          <button
            type="button"
            className={`eq-toggle eq-toggle--auto${eqAuto ? ' is-on' : ''}`}
            title="Automatic preamp"
            aria-pressed={eqAuto}
            onClick={toggleEqAuto}
          >
            <span className={`led${eqAuto ? ' is-on' : ''}`} />
            <span>AUTO</span>
          </button>
          <button
            type="button"
            className="eq-presets"
            title="Load equalizer preset"
            onClick={(event) => presetsMenu(event.currentTarget)}
          >
            PRESETS
          </button>

          <EqGraph bands={bands} enabled={eqEnabled} onChange={setBand} />

          <div className="eq-bands">
            <EqBand
              index={null}
              label="PREAMP"
              value={preamp}
              ariaLabel="Preamp"
              onChange={setPreamp}
              onCommit={() => flash(`PREAMP: ${usePlayerStore.getState().preamp.toFixed(1)} dB`, 1200)}
            />
            {bands.map((band, index) => (
              <EqBand
                key={EQ_FREQS[index]}
                index={index}
                label={EQ_LABELS[index]}
                value={band}
                ariaLabel={`${EQ_FREQS[index]} Hz band`}
                onChange={(value) => setBand(index, value)}
                onCommit={() =>
                  flash(`${EQ_LABELS[index]} HZ: ${usePlayerStore.getState().bands[index].toFixed(1)} dB`, 1200)
                }
              />
            ))}
          </div>
        </div>
      )}
    </WindowShell>
  );
}
