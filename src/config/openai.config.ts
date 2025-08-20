import { registerAs } from '@nestjs/config';

export default registerAs('openai', () => ({
    apiKey: process.env.OPENAI_API_KEY,
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS, 10) || 8191,
    timeout: parseInt(process.env.OPENAI_TIMEOUT, 10) || 30000,
}));