import { useState, useCallback } from 'react';
import type { LLMMessage, LLMResponse } from '../types';
import { sendMessage } from '../lib/api';

interface UseLLMOptions {
  onResponse?: (response: LLMResponse) => void;
  onError?: (error: Error) => void;
}

interface UseLLMState {
  isLoading: boolean;
  error: Error | null;
  lastResponse: LLMResponse | null;
  messages: LLMMessage[];
}

export function useLLM(options: UseLLMOptions = {}) {
  const [state, setState] = useState<UseLLMState>({
    isLoading: false,
    error: null,
    lastResponse: null,
    messages: [],
  });

  const sendPrompt = useCallback(
    async (content: string) => {
      const userMessage: LLMMessage = { role: 'user', content };

      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        messages: [...prev.messages, userMessage],
      }));

      try {
        const response = await sendMessage({
          messages: [...state.messages, userMessage],
        });

        const assistantMessage: LLMMessage = {
          role: 'assistant',
          content: response.content,
        };

        setState((prev) => ({
          ...prev,
          isLoading: false,
          lastResponse: response,
          messages: [...prev.messages, assistantMessage],
        }));

        options.onResponse?.(response);
        return response;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err,
        }));
        options.onError?.(err);
        throw err;
      }
    },
    [state.messages, options]
  );

  const clearHistory = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      lastResponse: null,
      messages: [],
    });
  }, []);

  const setSystemMessage = useCallback((content: string) => {
    const systemMessage: LLMMessage = { role: 'system', content };
    setState((prev) => ({
      ...prev,
      messages: [systemMessage, ...prev.messages.filter((m) => m.role !== 'system')],
    }));
  }, []);

  return {
    ...state,
    sendPrompt,
    clearHistory,
    setSystemMessage,
  };
}

export default useLLM;
