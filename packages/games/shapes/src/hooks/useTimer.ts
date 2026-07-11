import { useEffect, useRef, useCallback, useState } from 'react';
import { playTickSound, playCountdownNumber } from '../utils/sounds';

interface UseTimerOptions {
  initialSeconds: number;
  onTick?: (secondsRemaining: number) => void;
  onComplete?: () => void;
  autoStart?: boolean;
}

interface UseTimerReturn {
  seconds: number;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  reset: (newSeconds?: number, autoStart?: boolean) => void;
}

export function useTimer({
  initialSeconds,
  onTick,
  onComplete,
  autoStart = false,
}: UseTimerOptions): UseTimerReturn {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const intervalRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onTickRef = useRef(onTick);

  // Keep refs updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onTickRef.current = onTick;
  }, [onComplete, onTick]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Timer logic
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setSeconds((prev) => {
        const newSeconds = prev - 1;

        // Play sounds
        if (newSeconds > 10) {
          playTickSound();
        } else if (newSeconds > 0) {
          // Countdown voice for final 10 seconds
          playCountdownNumber(newSeconds);
        }

        // Notify tick callback
        onTickRef.current?.(newSeconds);

        // Check for completion
        if (newSeconds <= 0) {
          setIsRunning(false);
          onCompleteRef.current?.();
          return 0;
        }

        return newSeconds;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  const start = useCallback(() => {
    if (seconds > 0) {
      setIsRunning(true);
    }
  }, [seconds]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback((newSeconds?: number, autoStart?: boolean) => {
    const time = newSeconds ?? initialSeconds;
    setSeconds(time);
    setIsRunning(autoStart === true && time > 0);
  }, [initialSeconds]);

  return {
    seconds,
    isRunning,
    start,
    pause,
    reset,
  };
}

export default useTimer;
