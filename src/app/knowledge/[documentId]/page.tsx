'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { KnowledgeDocument } from '@/ai/knowledge/types';
import { ChevronLeft, Trash2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { WorkspaceLayout } from '@/components/layout/workspace-layout';

export default function DocumentPage({ params }: { params: Promise<{ documentId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [doc, setDoc] = useState<KnowledgeDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocument();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // In a real app we might poll if status is 'processing' or 'queued'
  }, [resolvedParams.documentId]);

  const fetchDocument = async () => {
    try {
      const res = await fetch(`/api/knowledge/documents/${resolvedParams.documentId}`);
      if (res.ok) {
        setDoc(await res.json());
      } else {
        setError('Document not found.');
      }
    } catch (e) /* eslint-disable-line @typescript-eslint/no-unused-vars */ {
      setError('Failed to load document.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await fetch(`/api/knowledge/documents/${resolvedParams.documentId}`, { method: 'DELETE' });
      router.push('/knowledge');
    } catch (e) /* eslint-disable-line @typescript-eslint/no-unused-vars */ {
      alert('Failed to delete.');
    }
  };

  const handleRetry = async () => {
    try {
      await fetch(`/api/knowledge/documents/${resolvedParams.documentId}/process`, { method: 'POST' });
      fetchDocument();
    } catch (e) /* eslint-disable-line @typescript-eslint/no-unused-vars */ {
      alert('Failed to retry processing.');
    }
  };

  if (loading) {
    return (
      <WorkspaceLayout>
        <div className="p-6">Loading...</div>
      </WorkspaceLayout>
    );
  }
  if (error || !doc) {
    return (
      <WorkspaceLayout>
        <div className="p-6 text-red-500">{error}</div>
      </WorkspaceLayout>
    );
  }

  return (
    <WorkspaceLayout>
      <div className="p-6 max-w-4xl mx-auto">
      <Link href="/knowledge" className="flex items-center text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 mb-6 w-fit">
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to Knowledge Vault
      </Link>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{doc.title}</h1>
            <p className="text-sm text-gray-500">Original filename: {doc.original_filename}</p>
          </div>
          <div className="flex gap-2">
            {(doc.status === 'failed' || doc.status === 'uploaded') && (
              <button
                onClick={handleRetry}
                className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Processing
              </button>
            )}
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition flex items-center"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-md">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</div>
            <div className="font-medium flex items-center capitalize">
              {doc.status === 'ready' && <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />}
              {doc.status === 'failed' && <AlertCircle className="w-4 h-4 text-red-500 mr-2" />}
              {doc.status === 'processing' && <RefreshCw className="w-4 h-4 text-blue-500 animate-spin mr-2" />}
              {doc.status}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-md">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Type</div>
            <div className="font-medium truncate">{doc.mime_type.split('/')[1] || doc.mime_type}</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-md">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Size</div>
            <div className="font-medium">{(doc.file_size / 1024).toFixed(1)} KB</div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-md">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Chunks</div>
            <div className="font-medium">{doc.chunk_count}</div>
          </div>
        </div>

        {doc.safe_error_message && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md text-sm mb-6 flex items-start">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium mb-1">Processing Error</div>
              {doc.safe_error_message}
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">Processing Details</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 text-sm">
            <div>
              <dt className="text-gray-500">Uploaded</dt>
              <dd className="font-medium">{new Date(doc.created_at).toLocaleString()}</dd>
            </div>
            {doc.processing_completed_at && (
              <div>
                <dt className="text-gray-500">Processed</dt>
                <dd className="font-medium">{new Date(doc.processing_completed_at).toLocaleString()}</dd>
              </div>
            )}
            {doc.page_count && (
              <div>
                <dt className="text-gray-500">Pages</dt>
                <dd className="font-medium">{doc.page_count}</dd>
              </div>
            )}
            {doc.character_count && (
              <div>
                <dt className="text-gray-500">Characters</dt>
                <dd className="font-medium">{doc.character_count.toLocaleString()}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  </WorkspaceLayout>
  );
}
