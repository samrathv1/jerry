import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateKnowledgeFile } from '@/ai/knowledge/validate-file';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('knowledge_documents')
    .select('*')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const validation = await validateKnowledgeFile(file);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Create database entry first to get the ID
    const { data: doc, error: dbError } = await supabase
      .from('knowledge_documents')
      .insert({
        user_id: user.id,
        title: validation.sanitizedFilename,
        original_filename: file.name || validation.sanitizedFilename,
        mime_type: validation.mimeType,
        file_size: file.size,
        storage_bucket: 'knowledge-files',
        storage_path: 'temp', // will update
        status: 'uploaded',
      })
      .select('id')
      .single();

    if (dbError || !doc) {
      return NextResponse.json({ error: 'Failed to create document record' }, { status: 500 });
    }

    // Upload to private storage: {user_id}/{document_id}/{filename}
    const storagePath = `${user.id}/${doc.id}/${validation.sanitizedFilename}`;
    
    const { error: uploadError } = await supabase.storage
      .from('knowledge-files')
      .upload(storagePath, validation.buffer!, {
        contentType: validation.mimeType || 'application/octet-stream',
        upsert: true
      });

    if (uploadError) {
      // Rollback DB
      await supabase.from('knowledge_documents').delete().eq('id', doc.id);
      return NextResponse.json({ error: 'Failed to upload file to storage' }, { status: 500 });
    }

    // Update with final storage path
    await supabase
      .from('knowledge_documents')
      .update({ storage_path: storagePath })
      .eq('id', doc.id);

    return NextResponse.json({ document_id: doc.id, success: true }, { status: 201 });

  } catch (e) /* eslint-disable-line @typescript-eslint/no-unused-vars */ {
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
