import type { CSSProperties, ReactNode } from 'react';
import { useSlider } from '../hooks/useSlider';

interface HorizontalSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  ariaLabel: string;
  className: string;
  disabled?: boolean;
  fillFromCenter?: boolean;
  onChange: (value: number) => void;
  onCommit?: () => void;
}

export function HorizontalSlider({
  value,
  min,
  max,
  step = 1,
  ariaLabel,
  className,
  disabled = false,
  fillFromCenter = false,
  onChange,
  onCommit,
}: HorizontalSliderProps): ReactNode {
  const { ref, handlers, dragging } = useSlider({
    value,
    min,
    max,
    step,
    onChange,
    onCommit,
    disabled,
  });
  const pct = max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0;
  const ratio = pct / 100;
  const style = { '--ratio': ratio } as CSSProperties;
  const fillStyle = fillFromCenter
    ? { left: `${Math.min(50, pct)}%`, width: `${Math.abs(50 - pct)}%` }
    : { left: 0, width: `${pct}%` };

  return (
    <div
      ref={ref}
      className={`h-slider ${className}${dragging ? ' is-dragging' : ''}${disabled ? ' is-disabled' : ''}`}
      style={style}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.round(value * 10) / 10}
      aria-valuetext={fillFromCenter ? `${Math.round(pct)}` : `${Math.round(value)}`}
      aria-disabled={disabled}
      {...handlers}
    >
      <div className="h-slider__groove" aria-hidden="true" />
      <div className="h-slider__fill" style={fillStyle} aria-hidden="true" />
      <div className="h-slider__thumb" aria-hidden="true" />
    </div>
  );
}
