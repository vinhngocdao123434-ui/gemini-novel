import { GlossaryEntry } from '../types';
import { transliterateLeftoverHanzi } from './sinoVietnameseDictionary';

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
   * Phân tích một dòng thuật ngữ kèm kiểm tra điều kiện nghiêm ngặt & tự động khử chữ Hán trong nghĩa dịch
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
        // 1. CHỐNG ĐẢO NGƯỢC: Nếu val chứa chữ Hán còn raw không chứa chữ Hán -> hoán đổi lại
        const chineseInRaw = this.countChineseChars(raw);
        const chineseInVal = this.countChineseChars(val);
        if (chineseInVal > 0 && chineseInRaw === 0) {
          const temp = raw;
          raw = val;
          val = temp;
        }

        // 2. KHỬ CHỮ HÁN TRONG NGHĨA DỊCH (VAL): Nếu val chứa chữ Hán (như "Trần Th硕") -> tự động phiên âm thành "Trần Thạc"
        if (this.countChineseChars(val) > 0) {
          const { result: cleanVal } = transliterateLeftoverHanzi(val);
          val = cleanVal;
        }

        // 3. LỌC ĐỘ DÀI: Bắt buộc từ >= minTermLength ký tự chữ Hán
        const finalChineseCount = this.countChineseChars(raw);
        if (finalChineseCount < (minTermLength > 0 ? minTermLength : 2)) {
          return null;
        }

        // 4. ĐIỀU KIỆN TẦN SUẤT: Phải xuất hiện từ minFrequency lần trở lên trong văn bản gốc
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
   * Tự động làm sạch toàn bộ từ điển dự án (Sanitize Master Glossary)
   */
  public static cleanGlossaryMap(map: Record<string, string>): Record<string, string> {
    const cleaned: Record<string, string> = {};
    for (let [k, v] of Object.entries(map || {})) {
      if (!k || !v) continue;
      k = this.cleanTerm(k);
      v = this.cleanTerm(v);
      if (this.countChineseChars(v) > 0) {
        const { result: cleanVal } = transliterateLeftoverHanzi(v);
        v = cleanVal;
      }
      if (k && v && this.countChineseChars(v) === 0) {
        cleaned[k] = v;
      }
    }
    return cleaned;
  }

  /**
   * Chuyển bảng từ điển thành chuỗi text định dạng `key = value` (đã lọc sạch 100% chữ Hán trong cột nghĩa)
   */
  public static getGlossaryAsString(map: Record<string, string>): string {
    if (!map || Object.keys(map).length === 0) {
      return '';
    }
    const sanitized = this.cleanGlossaryMap(map);
    return Object.entries(sanitized)
      .map(([k, v]) => `${k} = ${v}`)
      .join('\n');
  }
}
