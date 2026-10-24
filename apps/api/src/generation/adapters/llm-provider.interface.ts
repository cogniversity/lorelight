/**
 * Result returned by any LLM adapter's generateStructured call.
 */
export interface LlmGenerationResult {
  /** Raw JSON string returned by the model */
  raw: string;
  /** Parsed JavaScript object */
  parsed: Record<string, unknown>;
  /** Number of prompt / input tokens consumed */
  inputTokens?: number;
  /** Number of completion / output tokens produced */
  outputTokens?: number;
  /** Wall-clock milliseconds for the API call */
  durationMs: number;
}

/**
 * Common interface implemented by all LLM provider adapters.
 * Each adapter accepts a system prompt, a user prompt, and a JSON schema,
 * then returns a structured generation result.
 */
export interface ILlmProvider {
  generateStructured(
    systemPrompt: string,
    userPrompt: string,
    schema: object,
  ): Promise<LlmGenerationResult>;
}
