import { useCallback, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react';
import { clamp } from '../lib/format';

export interface SliderOptions {
  value: number;
  min: number;
  max: number;
  step?: number;
  orientation?: 'horizontal' | 'vertical';
  onChange: (value: number) => void;
  onStart?: () => void;
  onCommit?: () => void;
  disabled?: boolean;
}

interface SliderHandlers {
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void;
}

export function useSlider(options: SliderOptions): {
  ref: RefObject<HTMLDivElement | null>;
  handlers: SliderHandlers;
  dragging: boolean;
} {
  const { value, min, max, step = 1, orientation = 'horizontal', onChange, onStart, onCommit, disabled } = options;
  const ref = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  const quantize = useCallback(
    (value: number): number => {
      const rounded = Math.round(value / step) * step;
      return clamp(Number(rounded.toFixed(4)), min, max);
    },
    [min, max, step],
  );

  const valueFromPointer = useCallback(
    (clientX: number, clientY: number): number => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return min;
      const ratio =
        orientation === 'horizontal'
          ? (clientX - rect.left) / rect.width
          : 1 - (clientY - rect.top) / rect.height;
      return quantize(min + clamp(ratio, 0, 1) * (max - min));
    },
    [min, max, orientation, quantize],
  );

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (disabled || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = true;
    setDragging(true);
    onStart?.();
    onChange(valueFromPointer(event.clientX, event.clientY));
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!draggingRef.current || disabled) return;
    onChange(valueFromPointer(event.clientX, event.clientY));
  };

  const finish = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
    onCommit?.();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (disabled) return;
    const current = value;
    const stepValue = event.shiftKey ? step * 5 : step;
    let next: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = current + stepValue;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = current - stepValue;
    if (event.key === 'Home') next = min;
    if (event.key === 'End') next = max;
    if (next === null) return;
    event.preventDefault();
    onChange(quantize(next));
  };

  return {
    ref,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
      onKeyDown,
    },
    dragging,
  };
}

