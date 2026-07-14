import 'server-only';

export const KnowledgeConfig = {
  chunking: {
    targetTokenCount: 500,
    overlapTokenCount: 50,
    maxChunks: 2000,
  },
  embedding: {
    model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    dimensions: 1536,
    batchSize: 100,
    maxRetries: 3,
  },
  search: {
    defaultLimit: 5,
    minimumSimilarity: 0.6,
  }
};
