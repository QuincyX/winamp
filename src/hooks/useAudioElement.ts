import { useEffect } from 'react';
import type { RefObject } from 'react';
import { bindAudioElement } from '../audio/element';
import { engine } from '../audio/engine';
import { usePlayerStore } from '../store/playerStore';

/**
 * Connects the <audio> element to the store and the Web Audio graph.
 * The element itself stays uncontrolled: src changes happen in the store.
 */
export function useAudioElement(ref: RefObject<HTMLAudioElement | null>): void {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    bindAudioElement(element);
    engine.attach(element);

    const state = usePlayerStore.getState();
    engine.setVolume(state.volume);
    engine.setBalance(state.balance);
    engine.setEqualizer(state.bands, state.preamp, state.eqEnabled, state.eqAuto);

    const onTime = (): void => {
      usePlayerStore.getState().handleAudioTime(element.currentTime);
    };
    const onDuration = (): void => {
      usePlayerStore.getState().handleDuration(element.duration);
    };
    const onPlay = (): void => {
      usePlayerStore.setState({ status: 'playing' });
    };
    const onPause = (): void => {
      if (usePlayerStore.getState().status !== 'stopped') {
        usePlayerStore.setState({ status: 'paused' });
      }
    };
    const onEnded = (): void => {
      usePlayerStore.getState().handleEnded();
    };
    const onError = (): void => {
      if (element.error) {
        usePlayerStore.getState().handleAudioError();
      }
    };
    const onSeeked = (): void => {
      usePlayerStore.getState().handleAudioTime(element.currentTime);
    };

    element.addEventListener('timeupdate', onTime);
    element.addEventListener('durationchange', onDuration);
    element.addEventListener('loadedmetadata', onDuration);
    element.addEventListener('play', onPlay);
    element.addEventListener('pause', onPause);
    element.addEventListener('ended', onEnded);
    element.addEventListener('error', onError);
    element.addEventListener('seeked', onSeeked);

    return () => {
      element.removeEventListener('timeupdate', onTime);
      element.removeEventListener('durationchange', onDuration);
      element.removeEventListener('loadedmetadata', onDuration);
      element.removeEventListener('play', onPlay);
      element.removeEventListener('pause', onPause);
      element.removeEventListener('ended', onEnded);
      element.removeEventListener('error', onError);
      element.removeEventListener('seeked', onSeeked);
      bindAudioElement(null);
      engine.attach(null);
    };
  }, [ref]);
}

export function useEngineSync(): void {
  const volume = usePlayerStore((state) => state.volume);
  const balance = usePlayerStore((state) => state.balance);
  const bands = usePlayerStore((state) => state.bands);
  const preamp = usePlayerStore((state) => state.preamp);
  const eqEnabled = usePlayerStore((state) => state.eqEnabled);
  const eqAuto = usePlayerStore((state) => state.eqAuto);

  useEffect(() => {
    engine.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    engine.setBalance(balance);
  }, [balance]);

  useEffect(() => {
    engine.setEqualizer(bands, preamp, eqEnabled, eqAuto);
  }, [bands, preamp, eqEnabled, eqAuto]);
}
