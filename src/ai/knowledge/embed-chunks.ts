import 'server-only';
import OpenAI from 'openai';
import { KnowledgeConfig } from './knowledge-config';

export interface EmbeddedChunk {
  embedding: number[];
}

export async function embedChunks(chunks: string[]): Promise<EmbeddedChunk[]> {
  if (chunks.length === 0) {
    return [];
  }

  const { model, dimensions, batchSize, maxRetries } = KnowledgeConfig.embedding;
  const openai = new OpenAI();
  const embeddedChunks: EmbeddedChunk[] = [];
  
  // Process in batches
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    
    let attempt = 0;
    let success = false;
    let lastError: Error | null = null;
    
    while (attempt < maxRetries && !success) {
      try {
        const response = await openai.embeddings.create({
          model,
          input: batch,
          dimensions,
        });
        
        for (const data of response.data) {
          if (data.embedding.length !== dimensions) {
            const err = new Error(`Embedding dimension mismatch. Expected ${dimensions}, got ${data.embedding.length}`);
            (err as any).isFatal = true;
            throw err;
          }
          embeddedChunks.push({ embedding: data.embedding });
        }
        
        success = true;
      } catch (error: any) {
        if (error.isFatal) {
          throw error;
        }
        attempt++;
        lastError = error;
        // Basic backoff
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    if (!success) {
      // Do not log raw API keys or sensitive error details
      console.error('Failed to embed chunk batch after retries.');
      throw new Error('Failed to generate embeddings. Service may be unavailable.');
    }
  }
  
  return embeddedChunks;
}
