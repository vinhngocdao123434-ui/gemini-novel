import { ApiKeyItem } from '../types';
import { GlossaryManager } from './glossaryManager';

export interface LogCallback {
  (message: string, type?: 'info' | 'success' | 'warning' | 'error' | 'ai'): void;
}

export class GeminiEngine {
  private keys: ApiKeyItem[];
  private currentKeyIndex = 0;

  constructor(keys: ApiKeyItem[]) {
    this.keys = keys;
  }

  public updateKeys(keys: ApiKeyItem[]) {
    this.keys = keys;
  }

  private getNextAvailableKey(): ApiKeyItem | null {
    if (!this.keys || this.keys.length === 0) return null;
    const now = Date.now();

    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.currentKeyIndex + i) % this.keys.length;
      const item = this.keys[idx];
      if (item.state === 'ACTIVE' && item.cooldownUntil <= now) {
        this.currentKeyIndex = (idx + 1) % this.keys.length;
        return item;
      }
    }
    return this.keys[0];
  }

  public async testKey(item: ApiKeyItem): Promise<boolean> {
    item.state = 'TESTING';
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${item.key}`;
      const payload = {
        contents: [
          {
            parts: [{ text: 'ping' }],
          },
        ],
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        item.state = 'ACTIVE';
        item.cooldownUntil = 0;
        return true;
      } else {
        item.state = 'ERROR';
        return false;
      }
    } catch {
      item.state = 'ERROR';
      return false;
    }
  }

  public async translateChapter(
    chapterText: string,
    previousChapterSnippet: string | null,
    systemPrompt: string,
    glossary: Record<string, string>,
    modelName: string,
    targetLanguage: string = 'Tiếng Việt',
    antiHanziStrict: boolean = true,
    minTermLength: number = 2,
    minFrequency: number = 2,
    logger?: LogCallback
  ): Promise<[string, string]> {
    const maxRetries = Math.max(this.keys.length * 2, 4);
    let attempts = 0;

    while (attempts < maxRetries) {
      attempts++;
      const keyItem = this.getNextAvailableKey();
      if (!keyItem) {
        throw new Error('Không có API Key nào trong kho lưu trữ! Vui lòng thêm API Key ở Tab 1.');
      }

      const now = Date.now();
      if (keyItem.cooldownUntil > now) {
        const waitSec = Math.max(Math.ceil((keyItem.cooldownUntil - now) / 1000), 1);
        if (logger) logger(`⏳ Tất cả Key đang cooldown, chờ ${waitSec}s...`, 'warning');
        await new Promise((resolve) => setTimeout(resolve, waitSec * 1000));
      }

      try {
        keyItem.totalRequests++;
        const glossaryText = GlossaryManager.getGlossaryAsString(glossary);
        const nl = '\n';

        let promptText = `Bạn là chuyên gia dịch thuật tiểu thuyết hàng đầu thế giới.${nl}${nl}`;
        promptText += `[NGÔN NGỮ ĐÍCH]: ${targetLanguage || 'Tiếng Việt'}${nl}${nl}`;
        promptText += `[YÊU CẦU DỊCH THUẬT]:${nl}${systemPrompt}${nl}${nl}`;
        promptText += `[BẢNG TỪ ĐIỂN GLOSSARY BẮT BUỘC TUÂN THỦ]:${nl}`;
        promptText += glossaryText.length > 0 ? glossaryText : `(Chưa có, hãy tự trích xuất từ mới bên dưới)`;
        promptText += `${nl}${nl}`;

        if (previousChapterSnippet && previousChapterSnippet.trim().length > 0) {
          promptText += `[NGỮ CẢNH ĐOẠN CUỐI CHƯƠNG TRƯỚC (CHỈ DÙNG ĐỂ THAM KHẢO NGỮ CẢNH VÀ ĐỒNG NHẤT XƯNG HÔ, TUYỆT ĐỐI KHÔNG DỊCH LẠI VÀ TUYỆT ĐỐI KHÔNG TRÍCH XUẤT TỪ MỚI TỪ ĐÂY)]:${nl}`;
          promptText += `${previousChapterSnippet.trim()}${nl}${nl}`;
        }

        promptText += `[VĂN BẢN GỐC CHƯƠNG HIỆN TẠI (CHỈ DỊCH VÀ BÓC TÁCH TỪ ĐÂY)]:${nl}${chapterText}${nl}${nl}`;

        const isViet = !targetLanguage || targetLanguage.toLowerCase().includes('việt');
        const isJap = targetLanguage && (targetLanguage.toLowerCase().includes('nhật') || targetLanguage.toLowerCase().includes('japan') || targetLanguage.includes('日本語'));

        if (isViet && antiHanziStrict) {
          promptText += `[QUY TẮC BẮT BUỘC - CHỐNG LỌT CHỮ HÁN CHO TIẾNG VIỆT]:${nl}`;
          promptText += `- TUYỆT ĐỐI KHÔNG để sót bất kỳ ký tự chữ Hán (Hanzi) nào trong phần [TRANSLATION] tiếng Việt (100% chữ Hán phải được dịch nghĩa hoặc phiên âm Hán-Việt chuẩn).${nl}`;
          promptText += `- TUYỆT ĐỐI KHÔNG trộn lẫn nửa chữ Hán nửa tiếng Việt trong một danh từ riêng (ví dụ: '林辰' phải dịch là 'Lâm Thần', cấm viết '林 Thần').${nl}`;
          promptText += `- TUYỆT ĐỐI KHÔNG gõ sai lỗi bộ gõ Telex (ví dụ: 'Đangk' là lỗi gõ thừa phím k của 'Đăng').${nl}`;
          promptText += `- Tuân thủ triệt để bảng Glossary gửi kèm để đồng nhất tên nhân vật.${nl}${nl}`;
        } else if (isJap) {
          promptText += `[TARGET JAPANESE]: Translate fluently into natural Japanese, seamlessly incorporating Kanji, Hiragana, and Katakana.${nl}${nl}`;
        }

        promptText += `[QUY TẮC ĐẦU RA BẮT BUỘC]:${nl}`;
        promptText += `===TRANSLATION===${nl}`;
        promptText += `(Toàn bộ bản dịch trôi chảy)${nl}`;
        promptText += `===NEW_GLOSSARY===${nl}`;
        promptText += `(Chỉ trích xuất các DANH TỪ RIÊNG [tên nhân vật, tông môn, địa danh, công pháp, bảo vật] MỚI xuất hiện trong chương hiện tại CHƯA CÓ trong Glossary gửi kèm.${nl}`;
        promptText += `QUY TẮC NGHIÊM NGẶT:${nl}`;
        promptText += `1. ĐỘ DÀI: Bắt buộc từ ${minTermLength > 0 ? minTermLength : 2} ký tự chữ Hán trở lên. TUYỆT ĐỐI KHÔNG thêm từ 1 ký tự và KHÔNG thêm từ vựng thông dụng.${nl}`;
        promptText += `2. TẦN SUẤT: Tên riêng đó BẮT BUỘC phải xuất hiện từ ${minFrequency > 0 ? minFrequency : 2} lần trở lên trong văn bản gốc chương này.${nl}`;
        promptText += `3. ĐỊNH DẠNG: Mỗi dòng định dạng chuẩn: [TừGốc] = [NghĩaDịch]. TUYỆT ĐỐI KHÔNG ĐẢO NGƯỢC THỨ TỰ)`;

        const actualModel = modelName && modelName.trim() ? modelName.trim() : 'gemini-2.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${actualModel}:generateContent?key=${keyItem.key}`;

        const payload = {
          contents: [
            {
              parts: [{ text: promptText }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
          },
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const respJson = await response.json();
          keyItem.successRequests++;
          keyItem.state = 'ACTIVE';

          const candidates = respJson.candidates;
          if (candidates && candidates.length > 0) {
            const outText = candidates[0].content?.parts?.[0]?.text || '';
            return this.parseOutput(outText);
          } else {
            throw new Error('Không nhận được nội dung phản hồi từ Gemini.');
          }
        } else {
          const respStatus = response.status;
          if (respStatus === 429) {
            keyItem.state = 'COOLDOWN';
            keyItem.cooldownUntil = Date.now() + 60000;
            const masked = keyItem.key.length > 8 ? '...' + keyItem.key.slice(-6) : keyItem.key;
            if (logger) logger(`⚠️ Key ${masked} bị rate limit (429). Đang chuyển sang Key tiếp theo...`, 'warning');
          } else {
            const errText = await response.text().catch(() => '');
            if (logger) logger(`⚠️ Lỗi HTTP ${respStatus}: ${errText.slice(0, 100)}`, 'error');
          }
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        if (logger) logger(`⚠️ Ngoại lệ: ${errorMsg}`, 'error');
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    throw new Error(`Quá số lần thử lại tối đa (${maxRetries}). Tất cả các Key có thể đang bị giới hạn hoặc lỗi.`);
  }

  private parseOutput(text: string): [string, string] {
    if (!text || !text.trim()) {
      return ['', ''];
    }

    let translation = text;
    let newGlossary = '';

    const transRegex = /[#*]*[ \t\n\r]*===+[ \t\n\r]*TRANSLATION[ \t\n\r]*===+[#*]*/i;
    const glossRegex = /[#*]*[ \t\n\r]*===+[ \t\n\r]*NEW_GLOSSARY[ \t\n\r]*===+[#*]*/i;

    const mTrans = transRegex.exec(text);
    const mGloss = glossRegex.exec(text);

    let transStart = -1;
    if (mTrans) {
      transStart = mTrans.index + mTrans[0].length;
    }

    let glossStart = -1;
    if (mGloss) {
      glossStart = mGloss.index;
      const glossContentStart = mGloss.index + mGloss[0].length;
      newGlossary = text.substring(glossContentStart).trim();
    }

    if (transStart !== -1) {
      if (glossStart !== -1 && glossStart > transStart) {
        translation = text.substring(transStart, glossStart).trim();
      } else {
        translation = text.substring(transStart).trim();
      }
    } else if (glossStart !== -1) {
      translation = text.substring(0, glossStart).trim();
    } else {
      translation = text.trim();
    }

    // Xử lý codeblock markdown ```
    if (translation.startsWith('```')) {
      const firstNl = translation.indexOf('\n');
      if (firstNl !== -1) translation = translation.substring(firstNl + 1);
      if (translation.endsWith('```')) {
        translation = translation.substring(0, translation.length - 3).trim();
      }
    }

    if (newGlossary.startsWith('```')) {
      const firstNl = newGlossary.indexOf('\n');
      if (firstNl !== -1) newGlossary = newGlossary.substring(firstNl + 1);
      if (newGlossary.endsWith('```')) {
        newGlossary = newGlossary.substring(0, newGlossary.length - 3).trim();
      }
    }

    // Khử lỗi gõ sai bộ gõ Telex (như Xa Đangk Khoa -> Xa Đăng Khoa)
    translation = translation
      .replace(/\b([A-Za-zÀ-ỹ]+)ngk\b/gi, '$1ng')
      .replace(/\b([A-Za-zÀ-ỹ]+)awk\b/gi, '$1ă')
      .replace(/\b([A-Za-zÀ-ỹ]+)owk\b/gi, '$1ơ')
      .replace(/\b([A-Za-zÀ-ỹ]+)uwk\b/gi, '$1ư');

    return [translation.trim(), newGlossary.trim()];
  }
}
