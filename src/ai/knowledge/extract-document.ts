import * as pdfParseModule from 'pdf-parse';
const pdfParse = (pdfParseModule as any).default || pdfParseModule;
import * as mammoth from 'mammoth';

export interface ExtractionResult {
  text: string;
  pageCount?: number;
  characterCount: number;
}

export async function extractDocumentContent(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractionResult> {
  let extractedText = '';
  let pageCount: number | undefined;

  switch (mimeType) {
    case 'application/pdf': {
      try {
        const data = await pdfParse(buffer, {
          pagerender: function(pageData: any) {
            // A simple pagerender to inject page boundaries if needed,
            // but pdfParse by default preserves page boundaries reasonably well.
            return pageData.getTextContent().then((textContent: any) => {
              let lastY, text = '';
              for (const item of textContent.items) {
                if (lastY == item.transform[5] || !lastY) {
                  text += item.str;
                } else {
                  text += '\n' + item.str;
                }
                lastY = item.transform[5];
              }
              return `\n--- Page ${pageData.pageIndex + 1} ---\n${text}\n`;
            });
          }
        });
        extractedText = data.text;
        pageCount = data.numpages;
      } catch (e) /* eslint-disable-line @typescript-eslint/no-unused-vars */ {
        throw new Error('Failed to parse PDF document. It may be encrypted or corrupted.');
      }
      break;
    }

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      try {
        // mammoth.extractRawText extracts purely text, no HTML, no macros
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
      } catch (e) /* eslint-disable-line @typescript-eslint/no-unused-vars */ {
        throw new Error('Failed to parse DOCX document. It may be corrupted.');
      }
      break;
    }

    case 'text/plain':
    case 'text/markdown': {
      try {
        extractedText = buffer.toString('utf-8');
        // Basic check for UTF-8 decoding issues
        if (extractedText.includes('\uFFFD')) {
          // Has replacement characters, might not be valid UTF-8
          // But we will allow it, or we could reject if there are too many.
        }
      } catch (e) /* eslint-disable-line @typescript-eslint/no-unused-vars */ {
        throw new Error('Failed to read text document. Must be valid UTF-8.');
      }
      break;
    }

    default:
      throw new Error(`Unsupported MIME type for extraction: ${mimeType}`);
  }

  extractedText = extractedText.trim();
  
  if (!extractedText) {
    throw new Error('Document extraction yielded empty text.');
  }

  // Remove null bytes and control characters (except common whitespace)
  extractedText = extractedText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  return {
    text: extractedText,
    ...(pageCount ? { pageCount } : {}),
    characterCount: extractedText.length
  };
}
