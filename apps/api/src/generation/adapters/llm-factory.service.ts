import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmProviderConfig } from '@prisma/client';
import { ILlmProvider } from './llm-provider.interface';
import { OpenAiAdapter } from './openai.adapter';
import { OllamaAdapter } from './ollama.adapter';
import { LlamaCppAdapter } from './llamacpp.adapter';
import { decrypt } from '../../common/crypto.util';

/**
 * Factory service that builds the correct ILlmProvider adapter
 * from a persisted LlmProviderConfig record.
 * Handles API key decryption transparently.
 */
@Injectable()
export class LlmFactoryService {
  private readonly logger = new Logger(LlmFactoryService.name);

  constructor(private readonly config: ConfigService) {}

  build(providerConfig: LlmProviderConfig): ILlmProvider {
    const encKey =
      this.config.get<string>('app.secretEncryptionKey') ?? '';

    // Decrypt stored key if present, otherwise fall back to env var
    let apiKey: string | undefined;
    if (providerConfig.encryptedKey) {
      try {
        apiKey = decrypt(providerConfig.encryptedKey, encKey);
      } catch (err) {
        this.logger.error(
          `Failed to decrypt API key for config ${providerConfig.id}`,
          err,
        );
      }
    }

    switch (providerConfig.provider) {
      case 'OPENAI':
        return new OpenAiAdapter(
          providerConfig.model,
          apiKey ?? this.config.get<string>('app.llm.openaiApiKey') ?? '',
          providerConfig.maxTokens,
          providerConfig.temperature,
        );

      case 'OLLAMA':
        return new OllamaAdapter(
          providerConfig.baseUrl ??
            this.config.get<string>('app.llm.ollamaBaseUrl') ??
            'http://localhost:11434',
          providerConfig.model,
          providerConfig.maxTokens,
          providerConfig.temperature,
        );

      case 'LLAMACPP':
        return new LlamaCppAdapter(
          providerConfig.baseUrl ??
            this.config.get<string>('app.llm.llamacppBaseUrl') ??
            'http://localhost:8080',
          providerConfig.model,
          providerConfig.maxTokens,
          providerConfig.temperature,
        );

      default:
        throw new Error(`Unknown LLM provider: ${providerConfig.provider}`);
    }
  }
}
