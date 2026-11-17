import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { engine } from '../audio/engine';
import { usePlayerStore } from '../store/playerStore';
import type { VisMode } from '../lib/types';

interface VisualizerProps {
  mode: VisMode;
  width?: number;
  height?: number;
  className?: string;
  onClick?: () => void;
  title?: string;
}

const GRID = '#0b1b11';
const GREEN = '#2ee62e';
const GREEN_DIM = '#0d7a1c';
const YELLOW = '#e8dc3a';
const RED = '#ff3a1e';
const WAVE = '#38ff64';

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = '#020603';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = GRID;
  for (let x = 1; x < width; x += 2) {
    for (let y = 1; y < height; y += 2) {
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

export function Visualizer({
  mode,
  width = 76,
  height = 26,
  className,
  onClick,
  title = 'Visualization',
}: VisualizerProps): ReactNode {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peaksRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const barCount = Math.max(8, Math.floor(width / 4));
    peaksRef.current = new Array(barCount).fill(0);
    let raf = 0;

    const render = (): void => {
      const state = usePlayerStore.getState();
      const analyser = engine.analyser;
      drawGrid(ctx, width, height);

      if (mode === 'spectrum' && analyser && state.status !== 'stopped') {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const sampleRate = analyser.context.sampleRate;
        const nyquist = sampleRate / 2;
        const cell = 2;
        const maxCells = Math.floor((height - 1) / cell);
        peaksRef.current = peaksRef.current.slice(0, barCount);

        for (let i = 0; i < barCount; i += 1) {
          const frequency = 40 * (16000 / 40) ** (i / (barCount - 1));
          const bin = Math.min(data.length - 1, Math.round((frequency / nyquist) * data.length));
          const neighbours = (data[Math.max(0, bin - 1)] + data[bin] + data[Math.min(data.length - 1, bin + 1)]) / 3;
          let value = neighbours / 255;
          // A gentle high-frequency tilt keeps the far end of the log scale alive.
          value = Math.min(1, value ** 1.2 * (0.85 + (i / Math.max(1, barCount - 1)) * 1.35));
          if (value < 0.04) value = 0;
          const cells = Math.round(value * maxCells);
          const peak = Math.max(cells, (peaksRef.current[i] ?? 0) - 0.35);
          peaksRef.current[i] = peak;

          const x = 1 + i * 4;
          if (cells > 0) {
            for (let level = 0; level < cells; level += 1) {
              const y = height - 1 - level * cell;
              const fraction = level / maxCells;
              ctx.fillStyle = fraction > 0.82 ? RED : fraction > 0.56 ? YELLOW : fraction > 0.2 ? GREEN : GREEN_DIM;
              ctx.fillRect(x, y - 1, 2, 2);
            }
          }
          const peakCells = Math.round(peak);
          if (peakCells > 0) {
            const y = height - 1 - peakCells * cell;
            ctx.fillStyle = peakCells >= maxCells - 1 ? RED : YELLOW;
            ctx.fillRect(x, Math.max(0, y - 1), 2, 1);
          }
        }
      } else if (mode === 'oscilloscope' && analyser && state.status !== 'stopped') {
        const data = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(data);
        const step = data.length / width;
        ctx.fillStyle = WAVE;
        for (let x = 0; x < width; x += 1) {
          const value = (data[Math.floor(x * step)] - 128) / 128;
          const y = Math.round(height / 2 + value * (height / 2 - 1));
          ctx.fillRect(x, Math.max(0, Math.min(height - 1, y)), 1, 1);
          if (value > 0.15 || value < -0.15) {
            ctx.fillRect(x, Math.max(0, Math.min(height - 1, y + 1)), 1, 1);
          }
        }
      } else if (mode === 'oscilloscope') {
        ctx.fillStyle = GREEN_DIM;
        ctx.fillRect(0, Math.floor(height / 2), width, 1);
      }

      raf = window.requestAnimationFrame(render);
    };

    raf = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(raf);
  }, [mode, width, height]);

  const clickable = Boolean(onClick);
  return (
    <canvas
      ref={canvasRef}
      className={`visualizer-canvas${className ? ` ${className}` : ''}`}
      width={width}
      height={height}
      style={{ width, height }}
      onClick={onClick}
      title={title}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    />
  );
}
