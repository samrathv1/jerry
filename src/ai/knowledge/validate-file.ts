import 'server-only';
import { MAX_FILE_SIZE_BYTES, SupportedMimeTypes } from './types';

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedFilename?: string;
  mimeType?: string;
  buffer?: Buffer;
}

export async function validateKnowledgeFile(
  file: File
): Promise<FileValidationResult> {
  if (!file) {
    return { isValid: false, error: 'No file provided.' };
  }

  if (file.size === 0) {
    return { isValid: false, error: 'The file is empty.' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { isValid: false, error: 'The file exceeds the 10 MB size limit.' };
  }

  const mimeType = file.type;
  if (!SupportedMimeTypes.includes(mimeType as any)) {
    return { isValid: false, error: 'Unsupported file type. Only PDF, DOCX, TXT, and MD are supported.' };
  }

  // Prevent path traversal and sanitize filename
  const rawFilename = file.name || 'unnamed_file';
  // Strip out paths (e.g. ../, /etc/passwd, C:\windows\system32)
  let sanitizedFilename = rawFilename.replace(/^.*[\\/]/, '');
  
  // Remove dangerous characters
  sanitizedFilename = sanitizedFilename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  
  if (!sanitizedFilename || sanitizedFilename === '.' || sanitizedFilename === '..') {
    sanitizedFilename = 'document.txt';
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Magic byte checks for extra security against mismatched extensions
  if (mimeType === 'application/pdf') {
    // PDF magic bytes: %PDF (25 50 44 46)
    if (buffer.length < 4 || buffer[0] !== 0x25 || buffer[1] !== 0x50 || buffer[2] !== 0x44 || buffer[3] !== 0x46) {
      return { isValid: false, error: 'The file appears to be corrupted or is not a valid PDF.' };
    }
  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    // DOCX (ZIP) magic bytes: PK\x03\x04 (50 4B 03 04)
    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4B || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
      return { isValid: false, error: 'The file appears to be corrupted or is not a valid DOCX.' };
    }
  }

  return {
    isValid: true,
    sanitizedFilename,
    mimeType,
    buffer
  };
}
