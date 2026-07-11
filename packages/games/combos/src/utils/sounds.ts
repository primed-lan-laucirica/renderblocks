// Sound effects for RenderCombos

import type { Combo, ShapeType, ColorType, CountType } from '../types';
import { getComboAudioPath, COUNT_WORDS } from '../types';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

export function resumeAudioContext(): void {
  if (audioContext?.state === 'suspended') {
    audioContext.resume();
  }
}

// Audio cache to avoid reloading files
const audioCache: Map<string, HTMLAudioElement> = new Map();

function getAudio(path: string): HTMLAudioElement {
  let audio = audioCache.get(path);
  if (!audio) {
    audio = new Audio(path);
    audio.preload = 'auto';
    audioCache.set(path, audio);
  }
  return audio;
}

function playAudio(path: string, volume: number = 0.7): void {
  resumeAudioContext();
  const audio = getAudio(path);
  audio.volume = volume;
  audio.currentTime = 0;
  audio.play().catch(() => {
    console.warn(`Failed to play audio: ${path}`);
  });
}

function playAudioFresh(path: string, volume: number = 0.7): void {
  resumeAudioContext();
  const audio = new Audio(path);
  audio.volume = volume;
  audio.play().catch(() => {
    // Audio playback failed silently
  });
}

// --- Palette sounds (individual word audio) ---

export function playShapeSound(shape: ShapeType): void {
  playAudio(`/games/combos/audio/${shape}.mp3`);
}

export function playColorSound(color: ColorType): void {
  playAudio(`/games/combos/audio/${color}.mp3`);
}

export function playCountSound(count: CountType): void {
  const word = COUNT_WORDS[count];
  playAudio(`/games/combos/audio/${word}.mp3`);
}

// --- Combo phrase audio (pre-recorded full combo) ---

export function playComboSound(combo: Combo): void {
  const path = getComboAudioPath(combo);
  playAudio(path);
}

// --- Feedback sounds ---

export function playWrongSound(): void {
  playAudioFresh('/games/combos/audio/no.mp3');
}

export function playSnapSound(): void {
  playAudioFresh('/games/combos/audio/yes.mp3');
}

export function playHooraySound(): void {
  playAudioFresh('/games/combos/audio/cheer.mp3', 0.8);
}

// --- Timer sounds ---

export function playTickSound(): void {
  resumeAudioContext();
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, now);

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.08);
}

const NUMBER_AUDIO_MAP: Record<number, string> = {
  1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five',
  6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten',
};

export function playCountdownNumber(num: number): void {
  const audioFile = NUMBER_AUDIO_MAP[num];
  if (audioFile) {
    playAudioFresh(`/games/combos/audio/${audioFile}.mp3`, 0.9);
  } else {
    playTickSound();
  }
}

// --- Preload essential sounds ---

export function preloadAudio(): void {
  // Preload feedback sounds
  getAudio('/games/combos/audio/no.mp3');
  getAudio('/games/combos/audio/yes.mp3');
  getAudio('/games/combos/audio/cheer.mp3');

  // Preload countdown numbers
  Object.values(NUMBER_AUDIO_MAP).forEach((name) => {
    getAudio(`/games/combos/audio/${name}.mp3`);
  });
}

preloadAudio();
