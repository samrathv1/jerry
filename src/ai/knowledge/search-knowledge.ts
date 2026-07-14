import 'server-only';
import { createClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { SearchKnowledgeInput, SearchKnowledgeResult } from './types';
import { KnowledgeConfig } from './knowledge-config';

export async function searchKnowledge(
  userId: string,
  input: SearchKnowledgeInput
): Promise<SearchKnowledgeResult> {
  const supabase = await createClient();
  const { query, document_ids, limit = KnowledgeConfig.search.defaultLimit } = input;
  
  if (!query.trim()) {
    return { results: [], result_count: 0 };
  }

  // 1. Generate query embedding
  const openai = new OpenAI();
  const { model, dimensions } = KnowledgeConfig.embedding;
  const embedResponse = await openai.embeddings.create({
    model,
    input: query,
    dimensions
  });
  
  const queryEmbedding = embedResponse.data[0]!.embedding;
  if (queryEmbedding.length !== dimensions) {
    throw new Error('Query embedding dimension mismatch');
  }

  // 2. Call RPC match_knowledge_chunks
  const { data: chunks, error } = await supabase.rpc('match_knowledge_chunks', {
    query_embedding: queryEmbedding,
    match_count: limit,
    minimum_similarity: KnowledgeConfig.search.minimumSimilarity,
    optional_document_ids: document_ids || null
  });

  if (error) {
    console.error('Vector search failed', error);
    throw new Error('Vector search failed.');
  }

  if (!chunks || chunks.length === 0) {
    return { results: [], result_count: 0 };
  }

  // 3. Prompt-injection defense: Wrap the content
  const results = chunks.map((chunk: any) => {
    // Escape any explicit end-of-excerpt markers inside the chunk just in case
    const safeContent = chunk.content.replace(/---END OF UNTRUSTED EXCERPT---/g, '[REDACTED]');
    
    const excerpt = `
---START OF UNTRUSTED EXCERPT---
Source: ${chunk.document_title}
Location: ${chunk.location_label || `Page ${chunk.page_number || 'Unknown'}`}

${safeContent}
---END OF UNTRUSTED EXCERPT---
`.trim();

    return {
      source_id: chunk.document_id,
      chunk_id: chunk.chunk_id,
      source_title: chunk.document_title,
      // We don't have source_type strictly from RPC, we can query it or derive it
      source_type: 'DOCUMENT', 
      location: chunk.location_label || (chunk.page_number ? `Page ${chunk.page_number}` : null),
      excerpt,
      similarity: chunk.similarity
    };
  });

  return {
    results,
    result_count: results.length
  };
}
