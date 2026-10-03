import { GlossaryEntry } from '../types';

export class GlossaryManager {
  /**
   * Đếm số lượng ký tự chữ Hán (CJK Unified Ideographs)
   */
  public static countChineseChars(str: string | null | undefined): number {
    if (!str) return 0;
    let count = 0;
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code >= 0x4e00 && code <= 0x9fa5) {
        count++;
      }
    }
    return count;
  }

  /**
   * Đếm số lần xuất hiện của thuật ngữ trong đoạn văn bản
   */
  public static countOccurrences(text: string | null | undefined, term: string | null | undefined): number {
    if (!text || !term || term.length === 0) return 0;
    let count = 0;
    let pos = 0;
    while ((pos = text.indexOf(term, pos)) !== -1) {
      count++;
      pos += term.length;
    }
    return count;
  }

  /**
   * Làm sạch các ký tự bao quanh hoặc dấu ngoặc
   */
  public static cleanTerm(str: string | null | undefined): string {
    if (!str) return '';
    return str
      .replace(/"/g, '')
      .replace(/'/g, '')
      .replace(/`/g, '')
      .replace(/‘/g, '')
      .replace(/“/g, '')
      .replace(/”/g, '')
      .replace(/’/g, '')
      .replace(/\*/g, '')
      .replace(/-/g, '')
      .replace(/•/g, '')
      .replace(/【/g, '')
      .replace(/】/g, '')
      .replace(/\[/g, '')
      .replace(/\]/g, '')
      .trim();
  }

  /**
   * Phân tích một dòng thuật ngữ kèm kiểm tra điều kiện nghiêm ngặt
   */
  public static parseLine(
    line: string | null | undefined,
    chapterRawText?: string | null,
    minTermLength: number = 2,
    minFrequency: number = 2
  ): GlossaryEntry | null {
    if (!line) return null;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) return null;
    if (trimmed.toLowerCase() === 'none' || trimmed.toLowerCase().includes('không có')) return null;

    let parts: string[] | null = null;
    if (trimmed.includes('=')) {
      parts = trimmed.split('=', 2);
    } else if (trimmed.includes('➔')) {
      parts = trimmed.split('➔', 2);
    } else if (trimmed.includes('->')) {
      parts = trimmed.split('->', 2);
    } else if (trimmed.includes(':')) {
      parts = trimmed.split(':', 2);
    } else if (trimmed.includes('\t')) {
      parts = trimmed.split('\t', 2);
    }

    if (parts && parts.length === 2) {
      let raw = this.cleanTerm(parts[0]);
      let val = this.cleanTerm(parts[1]);

      if (raw.length > 0 && val.length > 0) {
        // 1. CHỐNG ĐẢO NGƯỢC: Nếu val chứa chữ Hán còn raw không chứa chữ Hán -> tự động hoán đổi lại đúng vị trí!
        const chineseInRaw = this.countChineseChars(raw);
        const chineseInVal = this.countChineseChars(val);
        if (chineseInVal > 0 && chineseInRaw === 0) {
          const temp = raw;
          raw = val;
          val = temp;
        }

        // 2. LỌC ĐỘ DÀI: Tuân thủ cài đặt minTermLength (mặc định: >= 2 ký tự chữ Hán)
        const finalChineseCount = this.countChineseChars(raw);
        if (finalChineseCount < (minTermLength > 0 ? minTermLength : 2)) {
          return null;
        }

        // 3. ĐIỀU KIỆN TẦN SUẤT: Phải xuất hiện từ minFrequency lần trở lên trong văn bản gốc
        if (chapterRawText && chapterRawText.length > 0) {
          const occ = this.countOccurrences(chapterRawText, raw);
          if (occ < (minFrequency > 0 ? minFrequency : 2)) {
            return null;
          }
        }

        return { key: raw, value: val };
      }
    }
    return null;
  }

  /**
   * Bóc tách và hợp nhất các thuật ngữ mới từ AI
   */
  public static mergeNewEntries(
    targetMap: Record<string, string>,
    newGlossaryBlock: string | null | undefined,
    chapterRawText?: string | null,
    minTermLength: number = 2,
    minFrequency: number = 2,
    conflictPolicy: 'keep-old' | 'overwrite' = 'keep-old'
  ): GlossaryEntry[] {
    const addedList: GlossaryEntry[] = [];
    if (!targetMap || !newGlossaryBlock || !newGlossaryBlock.trim()) {
      return addedList;
    }

    const lines = newGlossaryBlock.split('\n');
    for (const line of lines) {
      const entry = this.parseLine(line, chapterRawText, minTermLength, minFrequency);
      if (entry && entry.key && entry.value) {
        if (conflictPolicy === 'overwrite' || !(entry.key in targetMap)) {
          targetMap[entry.key] = entry.value;
          addedList.push(entry);
        }
      }
    }
    return addedList;
  }

  /**
   * Chuyển bảng từ điển thành chuỗi text định dạng `key = value`
   */
  public static getGlossaryAsString(map: Record<string, string>): string {
    if (!map || Object.keys(map).length === 0) {
      return '';
    }
    return Object.entries(map)
      .map(([k, v]) => `${k} = ${v}`)
      .join('\n');
  }
}
