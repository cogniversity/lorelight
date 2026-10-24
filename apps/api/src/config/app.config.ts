import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3001'),
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? '',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
  jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  secretEncryptionKey: process.env.SECRET_ENCRYPTION_KEY ?? '',
  minio: {
    endpoint: process.env.MINIO_ENDPOINT ?? 'localhost',
    port: parseInt(process.env.MINIO_PORT_INTERNAL ?? '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ROOT_USER ?? '',
    secretKey: process.env.MINIO_ROOT_PASSWORD ?? '',
    bucket: process.env.MINIO_BUCKET ?? 'lorelight-assets',
    publicUrl: process.env.MINIO_PUBLIC_URL ?? 'http://localhost:9000',
  },
  llm: {
    defaultProvider: process.env.LLM_DEFAULT_PROVIDER ?? 'openai',
    openaiApiKey: process.env.OPENAI_API_KEY ?? '',
    openaiDefaultModel: process.env.OPENAI_DEFAULT_MODEL ?? 'gpt-4o',
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    ollamaDefaultModel: process.env.OLLAMA_DEFAULT_MODEL ?? 'llama3.2',
    llamacppBaseUrl: process.env.LLAMACPP_BASE_URL ?? 'http://localhost:8080',
    llamacppDefaultModel: process.env.LLAMACPP_DEFAULT_MODEL ?? 'default',
  },
}));
