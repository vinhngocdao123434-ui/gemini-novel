export interface ApiKeyItem {
  key: string;
  state: 'ACTIVE' | 'COOLDOWN' | 'INVALID' | 'ERROR' | 'TESTING';
  cooldownUntil: number;
  totalRequests: number;
  successRequests: number;
}

export interface PromptCardItem {
  id: number;
  title: string;
  content: string;
  active: boolean;
}

export interface GlossaryEntry {
  key: string;
  value: string;
}

export interface ChapterAuditInfo {
  score: number;
  status: 'good' | 'healed' | 'critical';
  issues: string[];
  healedActions?: string[];
  timestamp?: string;
}

export interface ProjectData {
  projectName: string;
  currentChapterIdx: number;
  loadedRawContent: string;
  rawChapters: string[];
  translatedChapters: Record<number, string>;
  masterGlossary: Record<string, string>;
  chapterAuditStatus?: Record<number, ChapterAuditInfo>;
}

export interface AppSettings {
  currentProjectName: string;
  currentModel: string;
  delaySec: number;
  projectList: string[];
  minTermLength: number;
  minFrequency: number;
  conflictPolicy: 'keep-old' | 'overwrite';
  antiHanziStrict: boolean;
  targetLanguage: string;
  cooldownSeconds: number;
  rotationStrategy: 'round-robin' | 'least-used';
  contextSnippetLength: number;
  autoHealOffline: boolean;
  autoRetryCritical: boolean;
  maxRetryAttempts: number;
}

export type ReaderTheme = 'amoled' | 'sepia' | 'light';
export type ReaderMode = 'translated' | 'bilingual' | 'original';

export interface LogMessage {
  id: string;
  timestamp: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'ai';
}
