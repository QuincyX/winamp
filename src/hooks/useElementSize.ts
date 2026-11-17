import { useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export interface ElementSize {
  width: number;
  height: number;
}

/** Tracks an element's content-box-independent client size with ResizeObserver. */
export function useElementSize<T extends HTMLElement>(): [RefObject<T | null>, ElementSize] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = (): void => {
      setSize({ width: element.clientWidth, height: element.clientHeight });
    };
    update();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }

    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}
