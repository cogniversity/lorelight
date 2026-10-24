import { ILlmProvider, LlmGenerationResult } from './llm-provider.interface';

interface OpenAICompatResponse {
  choices: Array<{ message: { content: string } }>;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

/**
 * LLM adapter for llama.cpp server (OpenAI-compatible /v1 API).
 * Works with any llama.cpp or text-generation-webui OpenAI endpoint.
 */
export class LlamaCppAdapter implements ILlmProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly maxTokens: number,
    private readonly temperature: number,
  ) {}

  async generateStructured(
    systemPrompt: string,
    userPrompt: string,
    _schema: object,
  ): Promise<LlmGenerationResult> {
    const start = Date.now();

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`LlamaCpp error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as OpenAICompatResponse;
    const raw = data.choices?.[0]?.message?.content ?? '{}';

    return {
      raw,
      parsed: JSON.parse(raw) as Record<string, unknown>,
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
      durationMs: Date.now() - start,
    };
  }
}
