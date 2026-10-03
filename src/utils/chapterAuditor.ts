import { GlossaryManager } from './glossaryManager';

export interface AuditIssue {
  type:
    | 'empty_content'
    | 'length_too_short'
    | 'excessive_hanzi'
    | 'ai_refusal'
    | 'ai_conversational_intro'
    | 'ai_conversational_outro'
    | 'repetition_loop'
    | 'markdown_tag_leakage'
    | 'excessive_blank_lines'
    | 'telex_typos';
  severity: 'mild' | 'critical';
  message: string;
}

export interface AuditResult {
  isValid: boolean;
  score: number; // 0 - 100
  issues: AuditIssue[];
  hasCriticalError: boolean;
  hasMildError: boolean;
  cleanedText: string;
  healedActions: string[];
}

/**
 * Các mẫu câu AI từ chối dịch hoặc vi phạm an toàn (Lỗi NẶNG)
 */
const AI_REFUSAL_PATTERNS = [
  /tôi không thể (hoàn thành|dịch|hỗ trợ|xử lý)/i,
  /rất tiếc,? (nhưng )?tôi không thể/i,
  /i cannot (fulfill|translate|process|assist)/i,
  /as an ai,? i (cannot|am not able)/i,
  /vi phạm chính sách (nội dung|an toàn)/i,
  /safety guidelines/i,
  /content policy/i,
];

/**
 * Các mẫu câu AI mở đầu giao tiếp thừa (Lỗi NHẸ - Tự dọn offline được)
 */
const AI_INTRO_PATTERNS = [
  /^(dưới đây là|sau đây là|đây là) bản dịch( trôi chảy| chi tiết| hoàn chỉnh)?(:|\.)?/im,
  /^(tất nhiên|chắc chắn rồi|dạ|vâng),? (dưới đây|sau đây|tôi xin gửi) là bản dịch(:|\.)?/im,
  /^here is the (translation|translated text)(:|\.)?/im,
  /^(bản dịch|dịch thuật)( của bạn| tiểu thuyết)?(:|\.)?/im,
];

/**
 * Các mẫu câu AI kết thúc giao tiếp thừa (Lỗi NHẸ - Tự dọn offline được)
 */
const AI_OUTRO_PATTERNS = [
  /(hy vọng|chúc bạn)( đọc truyện vui vẻ| thích bản dịch này| hài lòng).*$/im,
  /(nếu bạn cần|hãy cho tôi biết nếu) cần chỉnh sửa thêm.*$/im,
  /hope this helps.*$/im,
];

export class ChapterAuditor {
  /**
   * Tự động làm sạch và sửa chữa các lỗi nhẹ Offline không tốn Gemini
   */
  public static cleanChapterOffline(
    text: string,
    glossary: Record<string, string> = {}
  ): { cleaned: string; healedActions: string[] } {
    if (!text) return { cleaned: '', healedActions: [] };

    let cleaned = text;
    const healedActions: string[] = [];

    // 1. Dỡ bỏ các thẻ phân tách và codeblock rò rỉ
    if (cleaned.includes('===TRANSLATION===') || cleaned.includes('===NEW_GLOSSARY===')) {
      cleaned = cleaned
        .replace(/[#*]*\s*===+\s*TRANSLATION\s*===+[#*]*/gi, '')
        .replace(/[#*]*\s*===+\s*NEW_GLOSSARY\s*===+[#*]*[\s\S]*$/gi, '');
      healedActions.push('Dỡ bỏ thẻ phân tách hệ thống (===TRANSLATION===)');
    }

    if (cleaned.startsWith('```')) {
      const firstNl = cleaned.indexOf('\n');
      if (firstNl !== -1) cleaned = cleaned.substring(firstNl + 1);
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.substring(0, cleaned.length - 3);
      }
      healedActions.push('Tháo bỏ vỏ bọc Markdown codeblock (```)');
    }

    // 2. Dọn dẹp câu chào mở đầu của AI
    const lines = cleaned.split('\n');
    let trimmedIntro = false;
    while (lines.length > 0) {
      const firstLine = lines[0].trim();
      if (!firstLine) {
        lines.shift();
        continue;
      }

      let isIntro = false;
      for (const pattern of AI_INTRO_PATTERNS) {
        if (pattern.test(firstLine)) {
          isIntro = true;
          break;
        }
      }

      if (isIntro) {
        lines.shift();
        trimmedIntro = true;
      } else {
        break;
      }
    }

    if (trimmedIntro) {
      cleaned = lines.join('\n');
      healedActions.push('Cắt bỏ câu chào giao tiếp mở đầu của AI');
    }

    // 3. Dọn dẹp câu kết lời chúc thừa của AI
    let trimmedOutro = false;
    for (const pattern of AI_OUTRO_PATTERNS) {
      if (pattern.test(cleaned)) {
        cleaned = cleaned.replace(pattern, '').trim();
        trimmedOutro = true;
      }
    }
    if (trimmedOutro) {
      healedActions.push('Cắt bỏ câu chúc / chào kết thúc của AI');
    }

    // 4. Khử lỗi gõ Telex phổ biến
    const beforeTelex = cleaned;
    cleaned = cleaned
      .replace(/\b([A-Za-zÀ-ỹ]+)ngk\b/gi, '$1ng')
      .replace(/\b([A-Za-zÀ-ỹ]+)awk\b/gi, '$1ă')
      .replace(/\b([A-Za-zÀ-ỹ]+)owk\b/gi, '$1ơ')
      .replace(/\b([A-Za-zÀ-ỹ]+)uwk\b/gi, '$1ư');
    if (cleaned !== beforeTelex) {
      healedActions.push('Sửa lỗi kẹt phím bộ gõ Telex (ngk, awk, owk, uwk)');
    }

    // 5. Khử bão dòng trắng (quá nhiều dòng trống liên tiếp)
    const beforeLines = cleaned;
    cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');
    if (cleaned !== beforeLines) {
      healedActions.push('Nén gọn các dòng trống dư thừa');
    }

    // 6. Thế bù tự động từ Glossary đối với chữ Hán còn sót lại
    if (glossary && Object.keys(glossary).length > 0) {
      let substitutedCount = 0;
      for (const [rawTerm, viTerm] of Object.entries(glossary)) {
        if (rawTerm && viTerm && cleaned.includes(rawTerm)) {
          cleaned = cleaned.replaceAll(rawTerm, viTerm);
          substitutedCount++;
        }
      }
      if (substitutedCount > 0) {
        healedActions.push(`Thế bù tự động ${substitutedCount} thuật ngữ Hán còn sót từ Glossary`);
      }
    }

    return {
      cleaned: cleaned.trim(),
      healedActions,
    };
  }

  /**
   * Phát hiện lỗi lặp từ vô tận (Degeneration loop)
   */
  public static detectRepetitionLoop(text: string): boolean {
    if (!text || text.length < 150) return false;

    // Kiểm tra câu hoặc cụm 4-8 từ lặp liên tiếp 4 lần trở lên
    const sentences = text.split(/[.!?\n]+/).map((s) => s.trim()).filter((s) => s.length > 8);
    for (let i = 0; i < sentences.length - 3; i++) {
      const current = sentences[i];
      if (
        current === sentences[i + 1] &&
        current === sentences[i + 2] &&
        current === sentences[i + 3]
      ) {
        return true;
      }
    }

    // Kiểm tra mẫu lặp ký tự liên tiếp dài (>50 ký tự giống hệt)
    const repeatingPattern = /(.{5,30})\1{4,}/;
    return repeatingPattern.test(text);
  }

  /**
   * Hàm kiểm tra chất lượng chương toàn diện (Audit Engine)
   */
  public static auditChapter(
    rawText: string,
    translatedText: string,
    glossary: Record<string, string> = {}
  ): AuditResult {
    const issues: AuditIssue[] = [];
    let score = 100;

    // Bước 1: Chạy dọn dẹp lỗi nhẹ offline trước
    const { cleaned: healedText, healedActions } = this.cleanChapterOffline(translatedText, glossary);

    // 1. Kiểm tra trống nội dung
    if (!healedText || healedText.trim().length === 0) {
      issues.push({
        type: 'empty_content',
        severity: 'critical',
        message: 'Bản dịch trống rỗng hoàn toàn hoặc chỉ có khoảng trắng.',
      });
      return {
        isValid: false,
        score: 0,
        issues,
        hasCriticalError: true,
        hasMildError: false,
        cleanedText: '',
        healedActions,
      };
    }

    // 2. Kiểm tra câu từ chối dịch của AI
    for (const pattern of AI_REFUSAL_PATTERNS) {
      if (pattern.test(healedText)) {
        if (healedText.length < 500) {
          issues.push({
            type: 'ai_refusal',
            severity: 'critical',
            message: 'Gemini từ chối dịch chương này do chính sách an toàn hoặc hạn chế.',
          });
          score -= 90;
          break;
        }
      }
    }

    // 3. Kiểm tra tỷ lệ độ dài (Length Ratio)
    const rawLen = rawText ? rawText.trim().length : 0;
    const transLen = healedText.length;

    if (rawLen > 200) {
      const ratio = transLen / rawLen;
      if (ratio < 0.35) {
        issues.push({
          type: 'length_too_short',
          severity: 'critical',
          message: `Nội dung quá ngắn so với văn bản gốc (Dịch: ${transLen} kt, Gốc: ${rawLen} kt, Tỷ lệ: ${Math.round(ratio * 100)}%). AI có thể đã ngắt giữa chừng.`,
        });
        score -= 50;
      } else if (ratio < 0.55) {
        issues.push({
          type: 'length_too_short',
          severity: 'mild',
          message: `Độ dài bản dịch hơi ngắn so với nguyên tác (${Math.round(ratio * 100)}%).`,
        });
        score -= 15;
      }
    }

    // 4. Kiểm tra lọt chữ Hán (Hanzi Leakage)
    const hanziCount = GlossaryManager.countChineseChars(healedText);
    if (hanziCount > 0) {
      const hanziRatio = hanziCount / transLen;
      if (hanziCount > 25 || hanziRatio > 0.05) {
        issues.push({
          type: 'excessive_hanzi',
          severity: 'critical',
          message: `Bản dịch bị lọt quá nhiều chữ Hán (${hanziCount} ký tự Hán, chiếm ${(hanziRatio * 100).toFixed(1)}%). Gần như chưa dịch hoàn tất.`,
        });
        score -= 45;
      } else if (hanziCount > 5) {
        issues.push({
          type: 'excessive_hanzi',
          severity: 'mild',
          message: `Còn sót ${hanziCount} chữ Hán chưa dịch hoặc chưa có trong Glossary.`,
        });
        score -= 10;
      }
    }

    // 5. Kiểm tra lặp từ vô tận
    if (this.detectRepetitionLoop(healedText)) {
      issues.push({
        type: 'repetition_loop',
        severity: 'critical',
        message: 'Phát hiện lỗi suy thoái mô hình (Degeneration loop): AI lặp đi lặp lại một câu hoặc một từ vô tận.',
      });
      score -= 60;
    }

    // 6. Ghi nhận các lỗi nhẹ đã tự sửa
    if (healedActions.length > 0) {
      for (const act of healedActions) {
        if (act.includes('câu chào')) {
          issues.push({
            type: 'ai_conversational_intro',
            severity: 'mild',
            message: 'Đã tự động cắt bỏ câu chào AI mở đầu.',
          });
        }
        if (act.includes('câu chúc')) {
          issues.push({
            type: 'ai_conversational_outro',
            severity: 'mild',
            message: 'Đã tự động cắt bỏ câu chúc kết AI.',
          });
        }
      }
    }

    const hasCriticalError = issues.some((i) => i.severity === 'critical');
    const hasMildError = issues.some((i) => i.severity === 'mild') || healedActions.length > 0;
    const finalScore = Math.max(0, Math.min(100, score));

    return {
      isValid: !hasCriticalError && finalScore >= 50,
      score: finalScore,
      issues,
      hasCriticalError,
      hasMildError,
      cleanedText: healedText,
      healedActions,
    };
  }
}
