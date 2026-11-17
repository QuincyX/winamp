let audioElement: HTMLAudioElement | null = null;

export function bindAudioElement(element: HTMLAudioElement | null): void {
  audioElement = element;
}

export function getAudioElement(): HTMLAudioElement | null {
  return audioElement;
}
