// Sound effects using Web Audio API

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

// Bloop sound for addition (blocks combining)
export function playAdditionSound(): void {
  resumeAudioContext();
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Main bloop tone - sine wave with pitch drop
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(600, now);
  oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.15);

  gainNode.gain.setValueAtTime(0.3, now);
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(now);
  oscillator.stop(now + 0.2);

  // Secondary harmonic for richness
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();

  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(900, now);
  osc2.frequency.exponentialRampToValueAtTime(300, now + 0.12);

  gain2.gain.setValueAtTime(0.15, now);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

  osc2.connect(gain2);
  gain2.connect(ctx.destination);

  osc2.start(now);
  osc2.stop(now + 0.15);
}

// Drop, bounce, and shimmer sound for subtraction (blocks splitting)
export function playSubtractionSound(): void {
  resumeAudioContext();
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Initial "drop" - low thud
  const dropOsc = ctx.createOscillator();
  const dropGain = ctx.createGain();

  dropOsc.type = 'sine';
  dropOsc.frequency.setValueAtTime(150, now);
  dropOsc.frequency.exponentialRampToValueAtTime(60, now + 0.1);

  dropGain.gain.setValueAtTime(0.4, now);
  dropGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

  dropOsc.connect(dropGain);
  dropGain.connect(ctx.destination);

  dropOsc.start(now);
  dropOsc.stop(now + 0.15);

  // Bounce sounds (decreasing intensity)
  const bounces = [
    { time: 0.12, freq: 120, duration: 0.08, volume: 0.2 },
    { time: 0.22, freq: 100, duration: 0.06, volume: 0.12 },
    { time: 0.30, freq: 90, duration: 0.04, volume: 0.06 },
  ];

  bounces.forEach(({ time, freq, duration, volume }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + time);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + time + duration);

    gain.gain.setValueAtTime(volume, now + time);
    gain.gain.exponentialRampToValueAtTime(0.01, now + time + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + time);
    osc.stop(now + time + duration);
  });

  // Shimmer effect - high frequency sparkle
  const shimmerStart = 0.1;
  for (let i = 0; i < 5; i++) {
    const shimmerOsc = ctx.createOscillator();
    const shimmerGain = ctx.createGain();

    shimmerOsc.type = 'sine';
    const baseFreq = 1200 + Math.random() * 800;
    shimmerOsc.frequency.setValueAtTime(baseFreq, now + shimmerStart + i * 0.05);

    shimmerGain.gain.setValueAtTime(0.08, now + shimmerStart + i * 0.05);
    shimmerGain.gain.exponentialRampToValueAtTime(0.01, now + shimmerStart + i * 0.05 + 0.1);

    shimmerOsc.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);

    shimmerOsc.start(now + shimmerStart + i * 0.05);
    shimmerOsc.stop(now + shimmerStart + i * 0.05 + 0.1);
  }
}

// Cached audio element for sneeze sound
let sneezeAudio: HTMLAudioElement | null = null;

// Cached audio element for gulp sound (trash can)
let gulpAudio: HTMLAudioElement | null = null;

// Preload the sneeze sound
function preloadSneezeSound(): void {
  if (sneezeAudio) return;

  sneezeAudio = new Audio('/sneeze.mp3');
  sneezeAudio.preload = 'auto';
  sneezeAudio.volume = 0.7;

  sneezeAudio.addEventListener('error', () => {
    console.warn('Sneeze sound file not found, using synthesized sound');
  });
}

// Preload the gulp sound
function preloadGulpSound(): void {
  if (gulpAudio) return;

  gulpAudio = new Audio('/gulp.mp3');
  gulpAudio.preload = 'auto';
  gulpAudio.volume = 0.7;

  gulpAudio.addEventListener('error', () => {
    console.warn('Gulp sound file not found');
  });
}

// Initialize preloading
preloadSneezeSound();
preloadGulpSound();

// Sneeze sound for sneeze-based splitting
export function playSneezeSound(): void {
  // Ensure audio context is resumed (required on mobile after user interaction)
  resumeAudioContext();

  // Try to play the audio file directly, fall back if it fails
  if (sneezeAudio) {
    sneezeAudio.currentTime = 0;
    sneezeAudio.play().catch(() => {
      // If audio file fails, fall back to synthesized
      playSynthesizedSneezeSound();
    });
    return;
  }

  // Fall back to synthesized sound
  playSynthesizedSneezeSound();
}

// Synthesized sneeze sound as fallback
function playSynthesizedSneezeSound(): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Quick inhale/wind-up (rising pitch)
  const inhaleOsc = ctx.createOscillator();
  const inhaleGain = ctx.createGain();

  inhaleOsc.type = 'sine';
  inhaleOsc.frequency.setValueAtTime(200, now);
  inhaleOsc.frequency.exponentialRampToValueAtTime(400, now + 0.1);

  inhaleGain.gain.setValueAtTime(0.05, now);
  inhaleGain.gain.linearRampToValueAtTime(0.15, now + 0.08);
  inhaleGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

  inhaleOsc.connect(inhaleGain);
  inhaleGain.connect(ctx.destination);

  inhaleOsc.start(now);
  inhaleOsc.stop(now + 0.12);

  // Main "ACHOO" burst - noise-like with multiple frequencies
  const burstTime = 0.1;
  const burstFreqs = [300, 450, 600, 800, 1000];

  burstFreqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = i % 2 === 0 ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(freq, now + burstTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.4, now + burstTime + 0.15);

    const volume = 0.12 - i * 0.02;
    gain.gain.setValueAtTime(volume, now + burstTime);
    gain.gain.exponentialRampToValueAtTime(0.01, now + burstTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + burstTime);
    osc.stop(now + burstTime + 0.2);
  });

  // Airy whoosh tail
  const whooshOsc = ctx.createOscillator();
  const whooshGain = ctx.createGain();

  whooshOsc.type = 'sine';
  whooshOsc.frequency.setValueAtTime(1500, now + 0.15);
  whooshOsc.frequency.exponentialRampToValueAtTime(300, now + 0.4);

  whooshGain.gain.setValueAtTime(0.08, now + 0.15);
  whooshGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

  whooshOsc.connect(whooshGain);
  whooshGain.connect(ctx.destination);

  whooshOsc.start(now + 0.15);
  whooshOsc.stop(now + 0.4);
}

// Resume audio context (needed after user interaction on some browsers)
export function resumeAudioContext(): void {
  if (audioContext?.state === 'suspended') {
    audioContext.resume();
  }
}

// Gulp sound for trash can (Big Tum eating blocks)
export function playGulpSound(): void {
  resumeAudioContext();
  if (gulpAudio) {
    gulpAudio.currentTime = 0;
    gulpAudio.play().catch(() => {
      // Silent fail - no fallback synth sound for gulp
    });
  }
}
