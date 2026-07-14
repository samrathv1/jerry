import { z } from 'zod';

export const KnowledgeDocumentStatusSchema = z.enum([
  'uploaded',
  'queued',
  'processing',
  'ready',
  'failed',
  'deleting',
  'deleted'
]);

export type KnowledgeDocumentStatus = z.infer<typeof KnowledgeDocumentStatusSchema>;

export const KnowledgeDocumentSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string(),
  original_filename: z.string(),
  mime_type: z.string(),
  file_size: z.number(),
  storage_bucket: z.string(),
  storage_path: z.string(),
  status: KnowledgeDocumentStatusSchema,
  extraction_method: z.string().nullable().optional(),
  page_count: z.number().nullable().optional(),
  character_count: z.number().nullable().optional(),
  chunk_count: z.number(),
  safe_error_message: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  processing_started_at: z.string().nullable().optional(),
  processing_completed_at: z.string().nullable().optional(),
  deleted_at: z.string().nullable().optional(),
});

export type KnowledgeDocument = z.infer<typeof KnowledgeDocumentSchema>;

export const KnowledgeChunkSchema = z.object({
  id: z.string().uuid(),
  document_id: z.string().uuid(),
  user_id: z.string().uuid(),
  chunk_index: z.number(),
  content: z.string(),
  token_count: z.number().nullable().optional(),
  page_number: z.number().nullable().optional(),
  section_title: z.string().nullable().optional(),
  location_label: z.string().nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
  created_at: z.string(),
});

export type KnowledgeChunk = z.infer<typeof KnowledgeChunkSchema>;

export const SearchKnowledgeInputSchema = z.object({
  query: z.string().min(1).max(2000),
  document_ids: z.array(z.string().uuid()).optional(),
  limit: z.number().min(1).max(20).optional().default(5),
});

export type SearchKnowledgeInput = z.infer<typeof SearchKnowledgeInputSchema>;

export const SearchKnowledgeResultSchema = z.object({
  results: z.array(z.object({
    source_id: z.string().uuid(),
    chunk_id: z.string().uuid(),
    source_title: z.string(),
    source_type: z.string(),
    location: z.string().nullable().optional(),
    excerpt: z.string(),
    similarity: z.number(),
  })),
  result_count: z.number(),
});

export type SearchKnowledgeResult = z.infer<typeof SearchKnowledgeResultSchema>;

export const FileUploadResultSchema = z.object({
  success: z.boolean(),
  document_id: z.string().uuid().optional(),
  error: z.string().optional(),
});

export type FileUploadResult = z.infer<typeof FileUploadResultSchema>;

export const SupportedMimeTypes = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown'
] as const;

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
