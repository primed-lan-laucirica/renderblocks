import { useState, useCallback, useEffect, useRef } from 'react';
import type { VoiceInputState } from '../types';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

const getSpeechRecognition = (): (new () => SpeechRecognition) | null => {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

export function useVoiceInput() {
  const [state, setState] = useState<VoiceInputState>({
    isListening: false,
    transcript: '',
    error: null,
    isSupported: false,
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognitionClass = getSpeechRecognition();
    setState((prev) => ({
      ...prev,
      isSupported: SpeechRecognitionClass !== null,
    }));

    if (SpeechRecognitionClass) {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const results = Array.from(event.results);
        const transcript = results
          .map((result) => result[0].transcript)
          .join('');

        setState((prev) => ({
          ...prev,
          transcript,
        }));
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setState((prev) => ({
          ...prev,
          isListening: false,
          error: event.error,
        }));
      };

      recognition.onend = () => {
        setState((prev) => ({
          ...prev,
          isListening: false,
        }));
      };

      recognition.onstart = () => {
        setState((prev) => ({
          ...prev,
          isListening: true,
          error: null,
        }));
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setState((prev) => ({
        ...prev,
        error: 'Speech recognition not supported',
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      transcript: '',
      error: null,
    }));

    try {
      recognitionRef.current.start();
    } catch (error) {
      // Already started, ignore
      console.warn('Speech recognition already started:', error);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    setState((prev) => ({
      ...prev,
      isListening: false,
      transcript: '',
      error: null,
    }));
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    reset,
  };
}

export default useVoiceInput;
