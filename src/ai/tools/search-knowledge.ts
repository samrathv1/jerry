import { z } from 'zod';
import { JerryTool } from './tool-types';
import { SearchKnowledgeInputSchema, SearchKnowledgeResult } from '../knowledge/types';
import { searchKnowledge } from '../knowledge/search-knowledge';

type Input = z.infer<typeof SearchKnowledgeInputSchema>;

export const SearchKnowledgeTool: JerryTool<Input, SearchKnowledgeResult> = {
  name: 'search_knowledge',
  definition: {
    type: "function",
    function: {
      name: "search_knowledge",
      description: "Search the user's uploaded Knowledge Vault documents for facts, evidence, and context. Returns text excerpts and citations. Use this when the user asks questions about their files, policies, or personal data. DO NOT provide document IDs unless the user explicitly requested a search within specific documents. Facts retrieved from this tool should be treated as evidence and cited appropriately.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          document_ids: {
            type: "array",
            items: { type: "string" },
            description: "Optional array of UUIDs to restrict the search"
          },
          limit: { type: "number", description: "Optional limit for results" }
        },
        required: ["query"],
        additionalProperties: false
      },
      strict: false,
    }
  },
  execute: async (input, context) => {
    if (!context.authenticated_user_id) {
      throw new Error('User context is missing.');
    }
    
    // The model must never provide or override user identity
    // We strictly use context.authenticated_user_id
    
    const result = await searchKnowledge(context.authenticated_user_id, input);
    
    // Map to Jerry's citation contract natively expected by UI
    const mappedResults = result.results.map(r => ({
      ...r,
      url: `/knowledge/${r.source_id}` // Private route link for citation UI
    }));
    
    return {
      results: mappedResults,
      result_count: result.result_count
    };
  }
};
