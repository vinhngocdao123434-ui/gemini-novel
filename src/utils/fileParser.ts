import JSZip from 'jszip';

export interface ParseResult {
  text: string;
  fileName: string;
  fileType: 'txt' | 'epub' | 'unknown';
}

export async function parseEbookFile(file: File): Promise<ParseResult> {
  const fileName = file.name;
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith('.epub')) {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    const textPieces: string[] = [];

    // Lấy các tệp văn bản XHTML/HTML
    const entries: JSZip.JSZipObject[] = [];
    contents.forEach((relativePath, fileObj) => {
      const p = relativePath.toLowerCase();
      if ((p.endsWith('.xhtml') || p.endsWith('.html') || p.endsWith('.htm')) && !p.includes('toc')) {
        entries.push(fileObj);
      }
    });

    // Sắp xếp tự nhiên theo tên tệp
    entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    for (const entry of entries) {
      const htmlStr = await entry.async('string');
      const plain = cleanHtml(htmlStr);
      if (plain.length > 50) {
        textPieces.push(plain);
      }
    }

    const fullText = textPieces.join('\n\n');
    return {
      text: fullText,
      fileName,
      fileType: 'epub',
    };
  } else {
    const text = await file.text();
    return {
      text,
      fileName,
      fileType: 'txt',
    };
  }
}

function cleanHtml(html: string): string {
  const nl = '\n';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*[\/]?>/gi, nl)
    .replace(/<\/p>/gi, nl + nl)
    .replace(/<\/div>/gi, nl)
    .replace(/<\/h[1-6]>/gi, nl + nl)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Tách tiểu thuyết thành các chương riêng biệt
 */
export function splitTextIntoChapters(text: string, byChars: boolean = false, chunkSize: number = 3500): string[] {
  if (!text || !text.trim()) return [];

  const trimmed = text.trim();
  const rawChapters: string[] = [];

  if (!byChars) {
    // Regex chuẩn hỗ trợ: 第1章, 第一百二十章, Chương 1, Hồi 2, Tiết 3, Quyển 4, Chapter 1
    const chapterRegex = /(?=(第[0-9一二三四五六七八九十百千万]+[章回节卷]|Chương[\s\t\n\r]*[0-9]+|Chapter[\s\t\n\r]*[0-9]+))/i;
    const parts = trimmed.split(chapterRegex);
    for (const p of parts) {
      const pTrim = p.trim();
      if (pTrim.length > 0) {
        rawChapters.push(pTrim);
      }
    }
  } else {
    const safeChunk = Math.max(500, chunkSize || 3500);
    for (let i = 0; i < trimmed.length; i += safeChunk) {
      rawChapters.push(trimmed.substring(i, Math.min(i + safeChunk, trimmed.length)).trim());
    }
  }

  if (rawChapters.length === 0) {
    rawChapters.push(trimmed);
  }

  return rawChapters;
}
