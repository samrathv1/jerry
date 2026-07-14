import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { extractDocumentContent } from './extract-document';
import { chunkDocument } from './chunk-document';
import { embedChunks } from './embed-chunks';

export async function processDocument(documentId: string, userId: string): Promise<void> {
  const supabase = await createClient();

  try {
    // 1. Fetch document and ensure it's in a valid state to process
    const { data: doc, error: docError } = await supabase
      .from('knowledge_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (docError || !doc) {
      throw new Error('Document not found or access denied.');
    }

    if (doc.status === 'processing') {
      throw new Error('Document is already processing.');
    }

    // 2. Mark as processing
    await supabase
      .from('knowledge_documents')
      .update({
        status: 'processing',
        processing_started_at: new Date().toISOString(),
        safe_error_messagerror: null
      })
      .eq('id', documentId)
      .eq('user_id', userId);

    // 3. Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(doc.storage_bucket)
      .download(doc.storage_path);

    if (downloadError || !fileData) {
      throw new Error('Failed to download file from storage.');
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());

    // 4. Extract
    const { text, pageCount, characterCount } = await extractDocumentContent(buffer, doc.mime_type);

    // 5. Chunk
    const chunks = chunkDocument(text);
    
    // 6. Embed
    const chunkContents = chunks.map(c => c.content);
    const embeddedChunks = await embedChunks(chunkContents);

    // 7. Persist chunks and embeddings
    const chunksToInsert = chunks.map((c, i) => ({
      document_id: documentId,
      user_id: userId,
      chunk_index: c.index,
      content: c.content,
      token_count: c.tokenCount,
      page_number: c.pageNumber,
      section_titlerror: c.sectionTitle,
      location_label: c.locationLabel,
      embedding: embeddedChunks[i]?.embedding
    }));

    // Clear any existing chunks (retry scenario)
    await supabase.from('knowledge_chunks').delete().eq('document_id', documentId);

    // Insert new chunks in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < chunksToInsert.length; i += BATCH_SIZE) {
      const batch = chunksToInsert.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase
        .from('knowledge_chunks')
        .insert(batch);
      
      if (insertError) {
        console.error('Failed to process document:', insertError);
        throw new Error('Failed to save document chunks.');
      }
    }

    // 8. Mark ready
    await supabase
      .from('knowledge_documents')
      .update({
        status: 'ready',
        page_count: pageCount,
        character_count: characterCount,
        chunk_count: chunksToInsert.length,
        processing_completed_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .eq('user_id', userId);

  } catch (e: any) {
    // 9. On failure, mark as failed
    const safeErrorMessage = e.message || 'An unknown error occurred during processing.';
    await supabase
      .from('knowledge_documents')
      .update({
        status: 'failed',
        safe_error_messagerror: safeErrorMessage,
        processing_completed_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .eq('user_id', userId);
    
    // Attempt to clean up any partial chunks so we don't leave partially searchable data
    await supabase.from('knowledge_chunks').delete().eq('document_id', documentId);
  }
}
