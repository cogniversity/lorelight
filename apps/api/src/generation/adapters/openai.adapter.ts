import OpenAI from 'openai';
import { ILlmProvider, LlmGenerationResult } from './llm-provider.interface';

/**
 * LLM adapter for OpenAI chat completions.
 * Uses response_format: { type: 'json_object' } to guarantee JSON output.
 */
export class OpenAiAdapter implements ILlmProvider {
  private readonly client: OpenAI;

  constructor(
    private readonly model: string,
    apiKey: string,
    private readonly maxTokens: number,
    private readonly temperature: number,
  ) {
    this.client = new OpenAI({ apiKey });
  }

  async generateStructured(
    systemPrompt: string,
    userPrompt: string,
    _schema: object,
  ): Promise<LlmGenerationResult> {
    const start = Date.now();

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: this.maxTokens,
      temperature: this.temperature,
    });

    const raw = response.choices[0]?.message?.content ?? '{}';

    return {
      raw,
      parsed: JSON.parse(raw) as Record<string, unknown>,
      inputTokens: response.usage?.prompt_tokens,
      outputTokens: response.usage?.completion_tokens,
      durationMs: Date.now() - start,
    };
  }
}
