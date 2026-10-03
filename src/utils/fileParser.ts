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
 * Tách tiểu thuyết thành các chương riêng biệt với độ chính xác cao
 */
export function splitTextIntoChapters(
  text: string,
  byChars: boolean = false,
  chunkSize: number = 3500
): string[] {
  if (!text || !text.trim()) return [];

  const trimmed = text.trim();

  if (byChars) {
    const safeChunk = Math.max(500, chunkSize || 3500);
    const rawChapters: string[] = [];
    for (let i = 0; i < trimmed.length; i += safeChunk) {
      rawChapters.push(trimmed.substring(i, Math.min(i + safeChunk, trimmed.length)).trim());
    }
    return rawChapters.length > 0 ? rawChapters : [trimmed];
  }

  // Khớp chính xác tiêu đề chương ở đầu dòng (line-start), KHÔNG bắt từ vụn vặt trong câu
  // Hỗ trợ:
  // - 第1章, 第 1 章, 第一百二十章, 第1回, 第1集
  // - Chương 1, Hồi 1, Tiết 1, Chapter 1
  const chapterLinePattern = /(?:^|\n)[ \t]*(?:第[0-9一二三四五六七八九十百千万零两\s]+[章回集]|Chương\s+[0-9]+|Hồi\s+[0-9]+|Chapter\s+[0-9]+)[^\n]*/gim;

  const matches: { index: number; text: string }[] = [];
  let match: RegExpExecArray | null;
  while ((match = chapterLinePattern.exec(trimmed)) !== null) {
    matches.push({
      index: match.index,
      text: match[0],
    });
  }

  // Nếu không tìm thấy mẫu tiêu đề nào phù hợp -> trả về toàn văn
  if (matches.length === 0) {
    return [trimmed];
  }

  const chapters: string[] = [];

  // Nếu có phần giới thiệu/lời tựa trước chương đầu tiên
  if (matches[0].index > 0) {
    const prologue = trimmed.substring(0, matches[0].index).trim();
    if (prologue.length > 80) {
      chapters.push(prologue);
    }
  }

  for (let i = 0; i < matches.length; i++) {
    const startIndex = matches[i].index;
    const endIndex = i < matches.length - 1 ? matches[i + 1].index : trimmed.length;
    const chapterContent = trimmed.substring(startIndex, endIndex).trim();

    if (chapterContent.length > 0) {
      chapters.push(chapterContent);
    }
  }

  return chapters.length > 0 ? chapters : [trimmed];
}
