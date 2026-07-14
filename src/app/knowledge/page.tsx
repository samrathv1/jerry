'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Upload, FileText, Trash2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { KnowledgeDocument } from '@/ai/knowledge/types';

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/knowledge/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (e) /* eslint-disable-line @typescript-eslint/no-unused-vars */ {
      console.error('Failed to fetch documents', e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be under 10 MB.');
      return;
    }

    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadRes = await fetch('/api/knowledge/documents', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData.error || 'Upload failed');
      }

      // Automatically trigger processing
      fetch(`/api/knowledge/documents/${uploadData.document_id}/process`, { method: 'POST' });

      // Refresh list
      await fetchDocuments();
    } catch (e) /* eslint-disable-line @typescript-eslint/no-unused-vars */ {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    // Optimistic update
    setDocuments(docs => docs.filter(d => d.id !== id));
    
    try {
      await fetch(`/api/knowledge/documents/${id}`, { method: 'DELETE' });
    } catch (e) /* eslint-disable-line @typescript-eslint/no-unused-vars */ {
      // Revert if error
      fetchDocuments();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'processing': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <div className="w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-600" />;
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Knowledge Vault</h1>

      <div className="mb-8">
        <label className="flex justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none dark:bg-gray-800 dark:border-gray-600 dark:hover:border-gray-500">
          <span className="flex items-center space-x-2">
            <Upload className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            <span className="font-medium text-gray-600 dark:text-gray-400">
              {uploading ? 'Uploading...' : 'Drop files to attach, or browse'}
              <span className="block text-sm text-gray-500 mt-1">Supported: PDF, DOCX, TXT, MD (Max 10 MB)</span>
            </span>
          </span>
          <input type="file" name="file_upload" className="hidden" accept=".pdf,.docx,.txt,.md" onChange={handleFileUpload} disabled={uploading} />
        </label>
        {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No documents found.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {documents.map((doc) => (
              <li key={doc.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center justify-between">
                <div className="flex items-center flex-1 min-w-0">
                  <div className="mr-4">{getStatusIcon(doc.status)}</div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/knowledge/${doc.id}`} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline truncate">
                      {doc.title}
                    </Link>
                    <div className="text-xs text-gray-500 mt-1 flex gap-3">
                      <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                      <span>{doc.mime_type.split('/')[1] || 'Unknown'}</span>
                      {doc.chunk_count > 0 && <span>{doc.chunk_count} chunks</span>}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors ml-4"
                  title="Delete Document"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
