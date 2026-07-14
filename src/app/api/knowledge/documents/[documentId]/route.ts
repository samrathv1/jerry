import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const resolvedParams = await params;
  const { documentId } = resolvedParams;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('knowledge_documents')
    .select('*')
    .eq('id', documentId)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const resolvedParams = await params;
  const { documentId } = resolvedParams;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Confirm document exists and belongs to user
  const { data: doc, error: fetchError } = await supabase
    .from('knowledge_documents')
    .select('*')
    .eq('id', documentId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // 2. Mark deleting
  await supabase
    .from('knowledge_documents')
    .update({ status: 'deleting' })
    .eq('id', documentId);

  try {
    // 3. Remove storage object
    if (doc.storage_path && doc.storage_path !== 'temp') {
      await supabase.storage.from(doc.storage_bucket).remove([doc.storage_path]);
    }

    // 4. Remove chunks and embeddings
    await supabase.from('knowledge_chunks').delete().eq('document_id', documentId);

    // 5. Mark document deleted
    await supabase
      .from('knowledge_documents')
      .update({ 
        status: 'deleted',
        deleted_at: new Date().toISOString()
      })
      .eq('id', documentId);

    return NextResponse.json({ success: true });
  } catch (e) /* eslint-disable-line @typescript-eslint/no-unused-vars */ {
    // Revert status if we failed to delete completely
    await supabase
      .from('knowledge_documents')
      .update({ status: 'failed', safe_error_message: 'Deletion partially failed.' })
      .eq('id', documentId);
    
    return NextResponse.json({ error: 'Deletion failed. Try again.' }, { status: 500 });
  }
}
