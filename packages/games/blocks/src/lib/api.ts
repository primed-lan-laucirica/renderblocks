import type { LLMRequest, LLMResponse } from '../types';

// Placeholder LLM configuration
// In production, you would configure your actual API endpoint and key here
interface LLMConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

const config: LLMConfig = {
  apiKey: import.meta.env.VITE_LLM_API_KEY,
  baseUrl: import.meta.env.VITE_LLM_BASE_URL || 'https://api.anthropic.com/v1',
  model: import.meta.env.VITE_LLM_MODEL || 'claude-3-haiku-20240307',
};

/**
 * Send a message to the LLM
 * Currently a placeholder that logs the prompt and returns a mock response
 */
export async function sendMessage(request: LLMRequest): Promise<LLMResponse> {
  // Log the prompt for development
  console.log('[LLM] Sending message:', {
    messages: request.messages,
    maxTokens: request.maxTokens,
  });

  // If no API key is configured, return a placeholder response
  if (!config.apiKey) {
    console.log('[LLM] No API key configured - returning placeholder response');

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const lastUserMessage = request.messages.filter((m) => m.role === 'user').pop();
    const userContent = lastUserMessage?.content || '';

    return {
      content: `[Placeholder Response] You said: "${userContent}". Configure VITE_LLM_API_KEY to enable real LLM responses.`,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
      },
    };
  }

  // Real API call would go here
  try {
    const response = await fetch(`${config.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: request.maxTokens || 1024,
        messages: request.messages.map((m) => ({
          role: m.role === 'system' ? 'user' : m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();

    return {
      content: data.content[0]?.text || '',
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0,
      },
    };
  } catch (error) {
    console.error('[LLM] API error:', error);
    throw error;
  }
}

/**
 * Check if the LLM is configured
 */
export function isLLMConfigured(): boolean {
  return Boolean(config.apiKey);
}

/**
 * Get the current LLM configuration (without exposing the API key)
 */
export function getLLMConfig(): Omit<LLMConfig, 'apiKey'> & { hasApiKey: boolean } {
  return {
    baseUrl: config.baseUrl,
    model: config.model,
    hasApiKey: Boolean(config.apiKey),
  };
}
