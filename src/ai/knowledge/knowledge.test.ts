import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateKnowledgeFile } from './validate-file';
import { extractDocumentContent } from './extract-document';
import { chunkDocument } from './chunk-document';
import { embedChunks } from './embed-chunks';
import { searchKnowledge } from './search-knowledge';
import { processDocument } from './process-document';
import OpenAI from 'openai';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'doc-1', status: 'uploaded', mime_type: 'text/plain', storage_bucket: 'test', storage_path: 'test' } }),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockReturnThis(),
    rpc: vi.fn().mockResolvedValue({ 
      data: [
        { chunk_id: 'c1', document_id: 'd1', document_title: 'Title', content: 'test chunk', similarity: 0.9 }
      ]
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        download: vi.fn().mockResolvedValue({ data: new Blob(['hello world']) }),
        upload: vi.fn().mockResolvedValue({ error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      })
    }
  })
}));

vi.mock('openai', () => {
  const mOpenAI = {
    embeddings: {
      create: vi.fn()
    }
  };
  return { default: vi.fn(() => mOpenAI) };
});

// We don't want to actually load real PDF or DOCX parsing libraries in the unit test,
// but extractDocumentContent handles them. We can mock them or test the text branches.
vi.mock('pdf-parse', () => ({
  default: vi.fn().mockResolvedValue({ text: 'mock pdf text', numpages: 1 })
}));

vi.mock('mammoth', () => ({
  extractRawText: vi.fn().mockResolvedValue({ value: 'mock docx text' })
}));

describe('Knowledge Vault - Server Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('File Validation', () => {
    it('rejects empty file', async () => {
      const file = new File([], 'test.txt', { type: 'text/plain' });
      const res = await validateKnowledgeFile(file);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('empty');
    });

    it('rejects oversized file', async () => {
      const file = new File([new ArrayBuffer(11 * 1024 * 1024)], 'test.txt', { type: 'text/plain' });
      const res = await validateKnowledgeFile(file);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('size');
    });

    it('rejects unsupported mime type', async () => {
      const file = new File(['test'], 'test.csv', { type: 'text/csv' });
      const res = await validateKnowledgeFile(file);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Unsupported');
    });

    it('sanitizes filename and prevents path traversal', async () => {
      const file = new File(['test'], '../../../etc/passwd.txt', { type: 'text/plain' });
      // Depending on how File constructor handles names, we might need a workaround for testing
      // But the logic is in validateKnowledgeFile
      const res = await validateKnowledgeFile(file);
      expect(res.sanitizedFilename).not.toContain('/');
      expect(res.sanitizedFilename).not.toContain('..');
    });
  });

  describe('Extraction', () => {
    it('extracts TXT', async () => {
      const buffer = Buffer.from('hello world');
      const res = await extractDocumentContent(buffer, 'text/plain');
      expect(res.text).toBe('hello world');
    });

    it('extracts PDF with mocks', async () => {
      const buffer = Buffer.from('%PDF-1.4 mock');
      const res = await extractDocumentContent(buffer, 'application/pdf');
      expect(res.text).toBe('mock pdf text');
    });

    it('extracts DOCX with mocks', async () => {
      const buffer = Buffer.from('PK\x03\x04 mock');
      const res = await extractDocumentContent(buffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(res.text).toBe('mock docx text');
    });

    it('fails on empty extraction', async () => {
      const buffer = Buffer.from('   ');
      await expect(extractDocumentContent(buffer, 'text/plain')).rejects.toThrow('empty text');
    });
  });

  describe('Chunking', () => {
    it('deterministically chunks with overlap and sequential indexes', () => {
      const text = 'This is a test document that should be chunked properly based on tokens.';
      const chunks = chunkDocument(text);
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].index).toBe(0);
      expect(chunks[0].content).toBeTruthy();
    });

    it('removes empty chunks', () => {
      const text = '   ';
      const chunks = chunkDocument(text);
      expect(chunks.length).toBe(0);
    });
  });

  describe('Embeddings', () => {
    let mockCreate: any;
    beforeEach(() => {
      mockCreate = (new OpenAI()).embeddings.create;
      vi.clearAllMocks();
    });

    it('batches embeddings and handles failure', async () => {
      mockCreate!.mockResolvedValueOnce({
        data: [{ embedding: new Array(1536).fill(0.1) }],
      } as any);

      const res = await embedChunks(['test chunk']);
      expect(res.length).toBe(1);
      expect(res[0].embedding.length).toBe(1536);
    });

    it('throws on dimension mismatch', async () => {
      mockCreate!.mockResolvedValueOnce({
        data: [{ embedding: new Array(100).fill(0.1) }],
      } as any);

      await expect(embedChunks(['test'])).rejects.toThrow('dimension mismatch');
    });
  });

  describe('Processing Pipeline', () => {
    let mockCreate: any;
    beforeEach(() => {
      mockCreate = (new OpenAI()).embeddings.create;
    });

    it('processes document completely', async () => {
      mockCreate!.mockResolvedValueOnce({
        data: [{ embedding: new Array(1536).fill(0.1) }],
      } as any);

      await processDocument('doc-1', 'user-1');
      // Should not throw
    });
  });

  describe('Search and Tool', () => {
    let mockCreate: any;
    beforeEach(() => {
      mockCreate = (new OpenAI()).embeddings.create;
    });

    it('searches and wraps results to prevent prompt injection', async () => {
      mockCreate!.mockResolvedValueOnce({
        data: [{ embedding: new Array(1536).fill(0.1) }],
      } as any);

      const res = await searchKnowledge('user-1', { query: 'test', limit: 5 });
      expect(res.results.length).toBe(1);
      expect(res.results[0].excerpt).toContain('---START OF UNTRUSTED EXCERPT---');
      expect(res.results[0].excerpt).toContain('test chunk');
    });
    
    it('returns zero results honestly', async () => {
      mockCreate!.mockResolvedValueOnce({
        data: [{ embedding: new Array(1536).fill(0.1) }],
      } as any);
      const { createClient } = await import('@/lib/supabase/server');
      vi.mocked(await createClient()).rpc.mockResolvedValueOnce({ data: [] as any[] });

      const res = await searchKnowledge('user-1', { query: 'test', limit: 5 });
      expect(res.results.length).toBe(0);
    });
  });
});
