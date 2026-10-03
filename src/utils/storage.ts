import { ApiKeyItem, AppSettings, ProjectData, PromptCardItem } from '../types';
import { GlossaryManager } from './glossaryManager';
import { transliterateLeftoverHanzi } from './sinoVietnameseDictionary';

const STORAGE_KEYS = {
  SETTINGS: 'droid_app_settings',
  KEYS: 'droid_api_keys',
  PROMPTS: 'droid_prompt_cards',
  PROJECT_PREFIX: 'droid_project_',
};

export const DEFAULT_SETTINGS: AppSettings = {
  currentProjectName: 'Dai_Quan_Gia_Ma_Hoang',
  currentModel: 'gemini-2.5-flash',
  delaySec: 2,
  projectList: ['Dai_Quan_Gia_Ma_Hoang', 'Pham_Nhan_Tu_Tien'],
  minTermLength: 2,
  minFrequency: 2,
  conflictPolicy: 'keep-old',
  antiHanziStrict: true,
  targetLanguage: 'Tiếng Việt',
  cooldownSeconds: 60,
  rotationStrategy: 'round-robin',
  contextSnippetLength: 350,
  autoHealOffline: true,
  autoRetryCritical: true,
  maxRetryAttempts: 3,
};

export const DEFAULT_PROMPT_CARDS: PromptCardItem[] = [
  {
    id: 1,
    title: 'Tiên Hiệp (Chuẩn mực)',
    content:
      'Dịch sang tiếng Việt tiểu thuyết tiên hiệp trôi chảy, đúng ngữ pháp. Động từ dịch nghĩa tự nhiên, không thô Hán-Việt. Xưng hô: hắn, nàng, ta, ngươi. Tên riêng giữ âm Hán-Việt.',
    active: true,
  },
  {
    id: 2,
    title: 'Đô Thị (Mượt mà)',
    content: 'Dịch văn phong hiện đại đời thường mượt mà. Giữ nguyên tên nhân vật Hán-Việt.',
    active: false,
  },
  {
    id: 3,
    title: 'Huyền Huyễn / Sử Thi',
    content: 'Dịch tiểu thuyết kỳ ảo, giữ nguyên thuật ngữ ma pháp, văn phong hào hùng.',
    active: false,
  },
];

export const DEFAULT_SAMPLE_KEYS: ApiKeyItem[] = [
  {
    key: 'AIzaSyDemoSampleKeyNumberOneXYZ12345',
    state: 'ACTIVE',
    cooldownUntil: 0,
    totalRequests: 0,
    successRequests: 0,
  },
  {
    key: 'AIzaSyDemoSampleKeyNumberTwoABC67890',
    state: 'ACTIVE',
    cooldownUntil: 0,
    totalRequests: 0,
    successRequests: 0,
  },
];

export function getInitialProjectData(name: string): ProjectData {
  if (name === 'Dai_Quan_Gia_Ma_Hoang') {
    return {
      projectName: name,
      currentChapterIdx: 0,
      loadedRawContent: '',
      rawChapters: [
        '第一章 少年与剑\n在偏僻的青石村中，有一位身负残破木剑的少年，名为林辰。\n林辰背着一把长剑，走在深邃的巷子里，眼神坚毅无比。\n青云宗的收徒大典即将开始，整个赵国风起云涌。\n赵霸天站在高处冷笑：“林辰，今日就是你的死期！”',
        '第二章 青云仙宗\n青云宗山门耸立在云海之巅，气势磅礴。\n数以千计的年轻才俊汇聚在巨大的演武广场上。\n黑风寨的探子潜伏在暗处，死死盯着演武场中央的林辰...',
      ],
      translatedChapters: {
        0: 'Chương 1: Thiếu Niên Và Kiếm\n\nTại thôn Thanh Thạch hẻo lánh, có một thiếu niên mang trên lưng thanh mộc kiếm tàn tạ, tên gọi Lâm Thần.\nLâm Thần đeo trường kiếm sau lưng, bước đi trong con ngõ sâu thẳm, ánh mắt vô cùng kiên định.\nĐại điển thu đồ của Thanh Vân Tông sắp sửa bắt đầu, toàn bộ Triệu quốc phong vân biến động.\nTriệu Bá Thiên đứng trên chỗ cao cười lạnh: "Lâm Thần, hôm nay chính là ngày tàn của ngươi!"\n',
      },
      masterGlossary: {
        林辰: 'Lâm Thần',
        青云宗: 'Thanh Vân Tông',
        赵霸天: 'Triệu Bá Thiên',
        黑风寨: 'Hắc Phong Trại',
        青石村: 'thôn Thanh Thạch',
      },
      chapterAuditStatus: {
        0: {
          score: 100,
          status: 'good',
          issues: [],
          healedActions: ['Đã qua kiểm định chất lượng'],
        },
      },
    };
  }

  return {
    projectName: name,
    currentChapterIdx: 0,
    loadedRawContent: '',
    rawChapters: [],
    translatedChapters: {},
    masterGlossary: {},
    chapterAuditStatus: {},
  };
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Error loading settings', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings', e);
  }
}

export function loadApiKeys(): ApiKeyItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.KEYS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error loading API keys', e);
  }
  return DEFAULT_SAMPLE_KEYS;
}

export function saveApiKeys(keys: ApiKeyItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.KEYS, JSON.stringify(keys));
  } catch (e) {
    console.error('Error saving API keys', e);
  }
}

export function loadPromptCards(): PromptCardItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROMPTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error loading prompt cards', e);
  }
  return DEFAULT_PROMPT_CARDS;
}

export function savePromptCards(prompts: PromptCardItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROMPTS, JSON.stringify(prompts));
  } catch (e) {
    console.error('Error saving prompt cards', e);
  }
}

export function loadProjectData(projectName: string): ProjectData {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.PROJECT_PREFIX}${projectName}`);
    if (raw) {
      const data: ProjectData = JSON.parse(raw);
      // Tự động làm sạch Master Glossary và các bản dịch hiện hữu
      if (data.masterGlossary) {
        data.masterGlossary = GlossaryManager.cleanGlossaryMap(data.masterGlossary);
      }
      if (data.translatedChapters) {
        for (const [idx, text] of Object.entries(data.translatedChapters)) {
          if (text) {
            const { result: cleanText } = transliterateLeftoverHanzi(text);
            data.translatedChapters[Number(idx)] = cleanText;
          }
        }
      }
      return data;
    }
  } catch (e) {
    console.error(`Error loading project ${projectName}`, e);
  }
  return getInitialProjectData(projectName);
}

export function saveProjectData(data: ProjectData): void {
  try {
    if (!data.projectName) return;
    localStorage.setItem(`${STORAGE_KEYS.PROJECT_PREFIX}${data.projectName}`, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving project ${data.projectName}`, e);
  }
}

export function deleteProjectFromStorage(projectName: string): void {
  try {
    localStorage.removeItem(`${STORAGE_KEYS.PROJECT_PREFIX}${projectName}`);
  } catch (e) {
    console.error(`Error deleting project ${projectName}`, e);
  }
}
