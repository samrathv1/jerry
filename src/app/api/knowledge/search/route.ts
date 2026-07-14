import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SearchKnowledgeInputSchema } from '@/ai/knowledge/types';
import { searchKnowledge } from '@/ai/knowledge/search-knowledge';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parseResult = SearchKnowledgeInputSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid search input' }, { status: 400 });
    }

    const startTime = Date.now();
    const result = await searchKnowledge(user.id, parseResult.data);
    const durationMs = Date.now() - startTime;

    // Log the query event asynchronously
    // Using a hash for query text to avoid logging sensitive user search data directly
    const queryHash = crypto.createHash('sha256').update(parseResult.data.query).digest('hex');
    const chunkIds = result.results.map(r => r.chunk_id);
    
    // We don't await this to keep the response fast
    supabase.from('knowledge_query_events').insert({
      user_id: user.id,
      query_text_hash: queryHash,
      retrieved_chunk_ids: chunkIds,
      result_count: result.result_count,
      duration_ms: durationMs
    }).then(); // Fire and forget

    return NextResponse.json(result);
  } catch (e) /* eslint-disable-line @typescript-eslint/no-unused-vars */ {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
