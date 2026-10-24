import { ILlmProvider, LlmGenerationResult } from './llm-provider.interface';

interface OllamaResponse {
  message: { content: string };
  prompt_eval_count?: number;
  eval_count?: number;
}

/**
 * LLM adapter for locally-hosted Ollama instances.
 * Uses the /api/chat endpoint with format:'json' to force JSON output.
 */
export class OllamaAdapter implements ILlmProvider {
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

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        format: 'json',
        stream: false,
        options: {
          num_predict: this.maxTokens,
          temperature: this.temperature,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as OllamaResponse;
    const raw = data.message?.content ?? '{}';

    return {
      raw,
      parsed: JSON.parse(raw) as Record<string, unknown>,
      inputTokens: data.prompt_eval_count,
      outputTokens: data.eval_count,
      durationMs: Date.now() - start,
    };
  }
}
