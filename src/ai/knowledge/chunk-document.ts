import 'server-only';
import { encoding_for_model } from 'tiktoken';
import { KnowledgeConfig } from './knowledge-config';

export interface Chunk {
  index: number;
  content: string;
  tokenCount: number;
  pageNumber?: number;
  sectionTitle?: string;
  locationLabel?: string;
}

export function chunkDocument(
  text: string
): Chunk[] {
  if (!text.trim()) {
    return [];
  }

  // Use a fallback if the model isn't recognized by tiktoken
  const encoder = encoding_for_model('text-embedding-3-small');
  
  try {
    const tokens = encoder.encode(text);
    const { targetTokenCount, overlapTokenCount, maxChunks } = KnowledgeConfig.chunking;
    
    const chunks: Chunk[] = [];
    let currentIndex = 0;
    
    // Process text into chunks based on token boundaries
    // This is a simplified token-based chunking. 
    // It decodes slices of tokens back into strings.
    
    let chunkIdx = 0;
    while (currentIndex < tokens.length && chunkIdx < maxChunks) {
      const endIndex = Math.min(currentIndex + targetTokenCount, tokens.length);
      const chunkTokens = tokens.slice(currentIndex, endIndex);
      
      const chunkText = new TextDecoder().decode(encoder.decode(chunkTokens)).trim();
      
      if (chunkText) {
        // Attempt to extract page number if we injected it during PDF parse
        let pageNumber: number | undefined = undefined;
        const pageMatch = chunkText.match(/--- Page (\d+) ---/);
        if (pageMatch) {
          pageNumber = parseInt(pageMatch[1] as string, 10);
        }

        chunks.push({
          index: chunkIdx,
          content: chunkText,
          tokenCount: chunkTokens.length,
          ...(pageNumber !== undefined ? { pageNumber: pageNumber as number } : {}),
          // Extract a naive section title (first sentence or line)
          locationLabel: `Chunk ${chunkIdx + 1}`
        });
        chunkIdx++;
      }
      
      currentIndex = endIndex - overlapTokenCount;
      if (currentIndex <= 0 || endIndex === tokens.length) {
        break; // Prevent infinite loops and finish if at end
      }
    }
    
    return chunks;
  } finally {
    encoder.free();
  }
}
