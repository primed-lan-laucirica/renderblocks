// Sound effects for RenderShapes

import type { ShapeType, ItemType, ContentClass, LetterType, NumberType } from '../types';
import { ALL_SHAPES } from '../types';

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

// Resume audio context (needed after user interaction on some browsers)
export function resumeAudioContext(): void {
  if (audioContext?.state === 'suspended') {
    audioContext.resume();
  }
}

// Audio cache to avoid reloading files
const audioCache: Map<string, HTMLAudioElement> = new Map();

// Preload and cache an audio file
function getAudio(path: string): HTMLAudioElement {
  let audio = audioCache.get(path);
  if (!audio) {
    audio = new Audio(path);
    audio.preload = 'auto';
    audioCache.set(path, audio);
  }
  return audio;
}

// Play an audio file (uses cache by default)
function playAudio(path: string, volume: number = 0.7): void {
  resumeAudioContext();
  const audio = getAudio(path);
  audio.volume = volume;
  audio.currentTime = 0;
  audio.play().catch(() => {
    console.warn(`Failed to play audio: ${path}`);
  });
}

// Play audio with a fresh element (for sounds that need to overlap)
function playAudioFresh(path: string, volume: number = 0.7): void {
  resumeAudioContext();
  const audio = new Audio(path);
  audio.volume = volume;
  audio.play().catch(() => {
    // Audio playback failed silently
  });
}

// Map shape types to audio file names
const SHAPE_AUDIO_MAP: Record<ShapeType, string> = {
  circle: 'circle',
  semicircle: 'half_circle',
  hexagon: 'hexagon',
  square: 'square',
  rectangle: 'rectangle',
  pentagon: 'pentagon',
  triangle: 'triangle',
  heptagon: 'heptagon',
  octagon: 'octagon',
  oval: 'oval',
  heart: 'heart',
  cross: 'cross',
  star: 'star',
  diamond: 'diamond',
  arrow: 'arrow',
  trapezoid: 'trapezoid',
};

// Play shape name when picked up
export function playShapeSound(shapeType: ShapeType): void {
  const audioFile = SHAPE_AUDIO_MAP[shapeType];
  playAudio(`/games/shapes/audio/${audioFile}.mp3`);
}

// Map letters to audio file names (uppercase to match actual files)
const LETTER_AUDIO_MAP: Record<LetterType, string> = {
  A: 'A', B: 'B', C: 'C', D: 'D', E: 'E', F: 'F', G: 'G', H: 'H', I: 'I',
  J: 'J', K: 'K', L: 'L', M: 'M', N: 'N', O: 'O', P: 'P', Q: 'Q', R: 'R',
  S: 'S', T: 'T', U: 'U', V: 'V', W: 'W', X: 'X', Y: 'Y', Z: 'Z',
};

// Map numbers 11-20 to audio file names (words)
const NUMBER_11_20_AUDIO_MAP: Record<string, string> = {
  '11': 'eleven',
  '12': 'twelve',
  '13': 'thirteen',
  '14': 'fourteen',
  '15': 'fifteen',
  '16': 'sixteen',
  '17': 'seventeen',
  '18': 'eighteen',
  '19': 'nineteen',
  '20': 'twenty',
};

// Play letter sound when picked up
export function playLetterSound(letter: LetterType): void {
  const audioFile = LETTER_AUDIO_MAP[letter];
  if (audioFile) {
    playAudioFresh(`/games/shapes/audio/${audioFile}.mp3`);
  }
}

// Play number sound when picked up
export function playNumberSound(num: NumberType): void {
  const numValue = parseInt(num, 10);
  if (numValue >= 1 && numValue <= 10) {
    const audioFile = NUMBER_AUDIO_MAP[numValue];
    if (audioFile) {
      playAudioFresh(`/games/shapes/audio/${audioFile}.mp3`);
    }
  } else if (numValue >= 11 && numValue <= 20) {
    const audioFile = NUMBER_11_20_AUDIO_MAP[num];
    if (audioFile) {
      playAudioFresh(`/games/shapes/audio/${audioFile}.mp3`);
    }
  }
}

// Generic item sound player
export function playItemSound(itemType: ItemType, contentClass: ContentClass): void {
  switch (contentClass) {
    case 'shapes':
      if (ALL_SHAPES.includes(itemType as ShapeType)) {
        playShapeSound(itemType as ShapeType);
      }
      break;
    case 'letters':
      playLetterSound(itemType as LetterType);
      break;
    case 'numbers':
      playNumberSound(itemType as NumberType);
      break;
  }
}

// Play "no" sound when wrong shape is placed
export function playWrongSound(): void {
  playAudioFresh('/games/shapes/audio/no.mp3');
}

// Play "yes" sound when correct shape is matched
export function playSnapSound(): void {
  playAudioFresh('/games/shapes/audio/yes.mp3');
}

// Play cheer sound when puzzle is complete
export function playHooraySound(): void {
  playAudioFresh('/games/shapes/audio/cheer.mp3', 0.8);
}

// Tick sound (each second of countdown) - synthesized
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

// Map numbers to word audio files
const NUMBER_AUDIO_MAP: Record<number, string> = {
  1: 'one',
  2: 'two',
  3: 'three',
  4: 'four',
  5: 'five',
  6: 'six',
  7: 'seven',
  8: 'eight',
  9: 'nine',
  10: 'ten',
};

// Countdown voice for final 10 seconds
// Uses playAudioFresh to avoid timing conflicts (each sound is ~1 second)
export function playCountdownNumber(num: number): void {
  const audioFile = NUMBER_AUDIO_MAP[num];
  if (audioFile) {
    playAudioFresh(`/games/shapes/audio/${audioFile}.mp3`, 0.9);
  } else {
    playTickSound();
  }
}

// Preload all audio files on startup
export function preloadAudio(): void {
  // Preload shape sounds
  Object.values(SHAPE_AUDIO_MAP).forEach((name) => {
    getAudio(`/games/shapes/audio/${name}.mp3`);
  });

  // Preload countdown number sounds
  Object.values(NUMBER_AUDIO_MAP).forEach((name) => {
    getAudio(`/games/shapes/audio/${name}.mp3`);
  });

  // Preload game event sounds
  getAudio('/games/shapes/audio/no.mp3');
  getAudio('/games/shapes/audio/yes.mp3');
  getAudio('/games/shapes/audio/cheer.mp3');
}

// Call preload on module load
preloadAudio();
