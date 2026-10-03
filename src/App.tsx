import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  KeyRound,
  Play,
  Settings,
} from 'lucide-react';
import {
  ApiKeyItem,
  AppSettings,
  ChapterAuditInfo,
  LogMessage,
  ProjectData,
  PromptCardItem,
} from './types';
import {
  getInitialProjectData,
  loadApiKeys,
  loadProjectData,
  loadPromptCards,
  loadSettings,
  saveApiKeys,
  saveProjectData,
  savePromptCards,
  saveSettings,
} from './utils/storage';
import { GeminiEngine } from './utils/geminiEngine';
import { GlossaryManager } from './utils/glossaryManager';
import { ChapterAuditor } from './utils/chapterAuditor';
import { downloadSourceCodeZip } from './utils/sourceExporter';

// Components
import { Header } from './components/Header';
import { TabKeys } from './components/TabKeys';
import { TabTranslate } from './components/TabTranslate';
import { TabReader } from './components/TabReader';
import { TabSettings } from './components/TabSettings';
import { FullScreenReaderModal } from './components/FullScreenReaderModal';
import { FullGlossaryModal } from './components/FullGlossaryModal';
import { PromptModal } from './components/PromptModal';
import { ProjectModal } from './components/ProjectModal';
import { EditGlossaryModal } from './components/EditGlossaryModal';
import { ExportNovelModal } from './components/ExportNovelModal';

export const App: React.FC = () => {
  // Global States
  const [activeTab, setActiveTab] = useState<number>(0);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>(loadApiKeys);
  const [promptCards, setPromptCards] = useState<PromptCardItem[]>(loadPromptCards);
  const [projectData, setProjectData] = useState<ProjectData>(() =>
    loadProjectData(loadSettings().currentProjectName)
  );
  const [logs, setLogs] = useState<LogMessage[]>([
    {
      id: '1',
      timestamp: new Date().toLocaleTimeString(),
      text: '🚀 DroidTranslator Native V10.4: Hệ Thống Cử Chỉ Vuốt Cạnh & Thoát App 2 Lần Sẵn Sàng!',
      type: 'info',
    },
  ]);

  // Translation Loop States
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentTranslatingIndex, setCurrentTranslatingIndex] = useState<number>(0);
  const [isScanningQuality, setIsScanningQuality] = useState<boolean>(false);

  // Modals
  const [readerChapterIndex, setReaderChapterIndex] = useState<number | null>(null);
  const [isFullGlossaryOpen, setIsFullGlossaryOpen] = useState<boolean>(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptCardItem | null | undefined>(undefined);
  const [projectModalMode, setProjectModalMode] = useState<'switch' | 'new' | null>(null);
  const [editingGlossaryPair, setEditingGlossaryPair] = useState<{ raw: string; vi: string } | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Double Back to Exit Toast State
  const [showExitToast, setShowExitToast] = useState<boolean>(false);

  // Refs for translation engine and loop control
  const engineRef = useRef<GeminiEngine>(new GeminiEngine(apiKeys));
  const isTranslatingRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const projectDataRef = useRef<ProjectData>(projectData);
  const settingsRef = useRef<AppSettings>(settings);
  const promptCardsRef = useRef<PromptCardItem[]>(promptCards);

  // Navigation state refs for instant synchronous access in event handlers
  const readerChapterIndexRef = useRef(readerChapterIndex);
  const isFullGlossaryOpenRef = useRef(isFullGlossaryOpen);
  const projectModalModeRef = useRef(projectModalMode);
  const editingPromptRef = useRef(editingPrompt);
  const editingGlossaryPairRef = useRef(editingGlossaryPair);
  const isExportModalOpenRef = useRef(isExportModalOpen);
  const activeTabRef = useRef(activeTab);
  const lastBackPressTimeRef = useRef<number>(0);
  const exitToastTimeoutRef = useRef<number | null>(null);

  // Keep navigation refs in sync
  useEffect(() => {
    readerChapterIndexRef.current = readerChapterIndex;
    isFullGlossaryOpenRef.current = isFullGlossaryOpen;
    projectModalModeRef.current = projectModalMode;
    editingPromptRef.current = editingPrompt;
    editingGlossaryPairRef.current = editingGlossaryPair;
    isExportModalOpenRef.current = isExportModalOpen;
    activeTabRef.current = activeTab;
  }, [
    readerChapterIndex,
    isFullGlossaryOpen,
    projectModalMode,
    editingPrompt,
    editingGlossaryPair,
    isExportModalOpen,
    activeTab,
  ]);

  // Sync refs & persist
  useEffect(() => {
    projectDataRef.current = projectData;
    saveProjectData(projectData);
  }, [projectData]);

  useEffect(() => {
    settingsRef.current = settings;
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    promptCardsRef.current = promptCards;
    savePromptCards(promptCards);
  }, [promptCards]);

  useEffect(() => {
    saveApiKeys(apiKeys);
    engineRef.current.updateKeys(apiKeys);
  }, [apiKeys]);

  // =========================================================================
  // CORE ANDROID BACK ENGINE (EDGE GESTURE + POPSTATE + DOUBLE-BACK TO EXIT)
  // =========================================================================
  const executeBackAction = (): boolean => {
    // 0. Nếu đang mở Modal Xuất file toàn văn -> Đóng Modal
    if (isExportModalOpenRef.current) {
      setIsExportModalOpen(false);
      return true;
    }
    // 1. Nếu đang mở Trình đọc Full màn hình -> Đóng Trình đọc
    if (readerChapterIndexRef.current !== null) {
      setReaderChapterIndex(null);
      return true;
    }
    // 2. Nếu đang mở Kho từ điển đầy đủ -> Đóng Modal
    if (isFullGlossaryOpenRef.current) {
      setIsFullGlossaryOpen(false);
      return true;
    }
    // 3. Nếu đang mở Modal chọn dự án -> Đóng Modal
    if (projectModalModeRef.current !== null) {
      setProjectModalMode(null);
      return true;
    }
    // 4. Nếu đang mở Modal chỉnh sửa Prompt -> Đóng Modal
    if (editingPromptRef.current !== undefined) {
      setEditingPrompt(undefined);
      return true;
    }
    // 5. Nếu đang mở Modal sửa cặp từ điển -> Đóng Modal
    if (editingGlossaryPairRef.current !== null) {
      setEditingGlossaryPair(null);
      return true;
    }
    // 6. Nếu đang ở các tab phụ (Key, Đọc truyện, Cài đặt) -> Quay về Tab Dịch chính (Tab 1)
    if (activeTabRef.current !== 1) {
      setActiveTab(1);
      return true;
    }

    // 7. Khi đã ở giao diện ngoài cùng (Tab 1 & Không có modal nào mở)
    // Áp dụng cơ chế Back 2 lần để thoát
    const now = Date.now();
    if (now - lastBackPressTimeRef.current < 2000) {
      // Đã bấm/vuốt back lần thứ 2 trong vòng 2 giây -> Cho phép thoát app
      setShowExitToast(false);
      return false; // Cho phép trình duyệt / WebView thoát
    } else {
      // Lần back đầu tiên -> Hiển thị Toast thông báo
      lastBackPressTimeRef.current = now;
      setShowExitToast(true);
      if (exitToastTimeoutRef.current) clearTimeout(exitToastTimeoutRef.current);
      exitToastTimeoutRef.current = window.setTimeout(() => {
        setShowExitToast(false);
      }, 2000);
      return true; // Chặn thoát app lần 1
    }
  };

  useEffect(() => {
    // Luôn cài đặt chốt chặn History Guard để Android không bao giờ thoát đột ngột
    const armGuard = () => {
      try {
        window.history.pushState({ droidNativeGuard: true, time: Date.now() }, '');
      } catch {}
    };

    // Khởi tạo Guard ban đầu
    armGuard();

    const onPopState = () => {
      const handled = executeBackAction();
      if (handled) {
        // Nạp lại Guard ngay lập tức để tiếp tục chặn thoát ngoài ý muốn
        armGuard();
      } else {
        // Thoát app thực sự: lùi lịch sử để thoát ra màn hình chính
        window.history.go(-2);
      }
    };

    window.addEventListener('popstate', onPopState);

    // Bắt thêm cử chỉ vuốt từ mép màn hình cảm ứng (Touch Edge Swipe Gesture)
    let startX = 0;
    let startY = 0;
    let isEdgeSwipe = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      const screenWidth = window.innerWidth;
      // Vuốt từ mép trái (< 40px) hoặc mép phải (> screenWidth - 40px)
      isEdgeSwipe = startX <= 40 || startX >= screenWidth - 40;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!isEdgeSwipe) return;
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = Math.abs(touch.clientY - startY);

      // Cử chỉ vuốt ngang rõ rệt: độ dài ngang > 45px và độ lệch dọc < 60px
      if (Math.abs(deltaX) > 45 && deltaY < 60) {
        const handled = executeBackAction();
        if (handled) {
          armGuard();
        } else {
          window.history.go(-2);
        }
      }
      isEdgeSwipe = false;
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  // Modal open helpers
  const openReaderModal = (idx: number) => {
    window.history.pushState({ modal: 'reader', idx }, '');
    setReaderChapterIndex(idx);
  };

  const openFullGlossaryModal = () => {
    window.history.pushState({ modal: 'glossary' }, '');
    setIsFullGlossaryOpen(true);
  };

  const openProjectSwitchModal = (mode: 'switch' | 'new') => {
    window.history.pushState({ modal: 'project', mode }, '');
    setProjectModalMode(mode);
  };

  const openPromptEditModal = (p?: PromptCardItem) => {
    window.history.pushState({ modal: 'prompt', id: p?.id }, '');
    setEditingPrompt(p || null);
  };

  const openEditGlossaryTermModal = (raw: string, vi: string) => {
    window.history.pushState({ modal: 'editGlossary', raw, vi }, '');
    setEditingGlossaryPair({ raw, vi });
  };

  const switchTab = (newTab: number) => {
    if (newTab !== activeTab) {
      window.history.pushState({ tab: newTab }, '');
      setActiveTab(newTab);
    }
  };

  const handleCloseActiveModal = () => {
    // Đóng trực tiếp mọi modal đang mở
    setReaderChapterIndex(null);
    setIsFullGlossaryOpen(false);
    setProjectModalMode(null);
    setEditingPrompt(undefined);
    setEditingGlossaryPair(null);
    setIsExportModalOpen(false);
  };

  const addLog = (text: string, type: 'info' | 'success' | 'warning' | 'error' | 'ai' = 'info') => {
    const newLog: LogMessage = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      text,
      type,
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 80)]);
  };

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleUpdateProjectData = (data: Partial<ProjectData>) => {
    setProjectData((prev) => ({ ...prev, ...data }));
  };

  // Project Switch / Create / Delete
  const handleSelectProject = (name: string) => {
    if (name === settings.currentProjectName) return;
    saveProjectData(projectData);
    const loaded = loadProjectData(name);
    setSettings((prev) => ({ ...prev, currentProjectName: name }));
    setProjectData(loaded);
    addLog(
      `📁 Đã chuyển sang dự án: ${name} (${Object.keys(loaded.translatedChapters).length}/${loaded.rawChapters.length} chương)`,
      'info'
    );
  };

  const handleCreateProject = (name: string) => {
    saveProjectData(projectData);
    const newProjectList = settings.projectList.includes(name)
      ? settings.projectList
      : [...settings.projectList, name];

    const initial = getInitialProjectData(name);
    setSettings((prev) => ({
      ...prev,
      currentProjectName: name,
      projectList: newProjectList,
    }));
    setProjectData(initial);
    addLog(`✨ Đã tạo và chuyển sang dự án mới: [${name}]`, 'success');
  };

  const handleDeleteCurrentProject = () => {
    const name = settings.currentProjectName;
    if (settings.projectList.length <= 1) {
      alert('Không thể xóa dự án duy nhất còn lại!');
      return;
    }

    const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn dự án [${name}] không?`);
    if (!confirmed) return;

    localStorage.removeItem(`droid_project_${name}`);
    const remainingList = settings.projectList.filter((p) => p !== name);
    const nextProjectName = remainingList[0];
    const nextProjectData = loadProjectData(nextProjectName);

    setSettings((prev) => ({
      ...prev,
      currentProjectName: nextProjectName,
      projectList: remainingList,
    }));
    setProjectData(nextProjectData);
    addLog(`🗑️ Đã xóa dự án: [${name}], chuyển sang [${nextProjectName}]`, 'warning');
  };

  // =========================================================================
  // CORE TRANSLATION LOOP WITH OFFLINE AUDITOR & AUTO-HEAL
  // =========================================================================
  const translateSingleChapterWithAudit = async (chapIndex: number): Promise<boolean> => {
    const rawText = projectDataRef.current.rawChapters[chapIndex];
    if (!rawText || !rawText.trim()) {
      addLog(`⚠️ Chương ${chapIndex + 1} trống nội dung gốc. Bỏ qua.`, 'warning');
      return false;
    }

    const model = settingsRef.current.currentModel;
    const targetLang = settingsRef.current.targetLanguage;
    const antiHanzi = settingsRef.current.antiHanziStrict;
    const minLen = settingsRef.current.minTermLength;
    const minFreq = settingsRef.current.minFrequency;
    const conflict = settingsRef.current.conflictPolicy;
    const autoRetry = settingsRef.current.autoRetryCritical;
    const maxAttempts = autoRetry ? (settingsRef.current.maxRetryAttempts || 2) + 1 : 1;

    // Active prompt
    let activePrompt = 'Dịch tiểu thuyết mượt mà';
    for (const p of promptCardsRef.current) {
      if (p.active) {
        activePrompt = p.content;
        break;
      }
    }

    // Context continuity
    let prevSnippet: string | null = null;
    if (chapIndex > 0 && chapIndex - 1 in projectDataRef.current.translatedChapters) {
      const prevText = projectDataRef.current.translatedChapters[chapIndex - 1];
      const snippetLen = settingsRef.current.contextSnippetLength || 350;
      prevSnippet = prevText.slice(-snippetLen);
    }

    let attempt = 0;
    let chapterResolved = false;

    while (attempt < maxAttempts && !chapterResolved && isTranslatingRef.current) {
      attempt++;

      if (attempt > 1) {
        addLog(
          `🔄 Đang yêu cầu Gemini dịch lại Chương ${chapIndex + 1} để ghi đè (Lần thử ${attempt}/${maxAttempts})...`,
          'warning'
        );
      } else {
        addLog(`⚡ Đang gửi Chương ${chapIndex + 1} đến ${model}...`, 'ai');
      }

      try {
        let currentPrompt = activePrompt;
        if (attempt > 1) {
          currentPrompt += `\n\n[CẢNH BÁO QUAN TRỌNG TỰ ĐỘNG GHI ĐÈ]: Lần trước bản dịch bị thiếu nội dung hoặc chỉ có từ điển. BẮT BUỘC bạn phải dịch đầy đủ 100% từng câu chữ của chương hiện tại vào khối ===TRANSLATION=== trước tiên.`;
        }

        const [translatedTextRaw, newGlossaryBlock] = await engineRef.current.translateChapter(
          rawText,
          prevSnippet,
          currentPrompt,
          projectDataRef.current.masterGlossary,
          model,
          targetLang,
          antiHanzi,
          minLen,
          minFreq,
          (msg, type) => addLog(msg, type)
        );

        // Bóc tách thuật ngữ mới & làm sạch 100% Glossary
        const currentGlossary = { ...projectDataRef.current.masterGlossary };
        GlossaryManager.mergeNewEntries(
          currentGlossary,
          newGlossaryBlock,
          rawText,
          minLen,
          minFreq,
          conflict
        );
        const sanitizedGlossary = GlossaryManager.cleanGlossaryMap(currentGlossary);

        // Chạy kiểm tra chất lượng Offline & Phiên âm tự động (0% Token)
        const audit = ChapterAuditor.auditChapter(rawText, translatedTextRaw, sanitizedGlossary);

        // Luôn áp dụng văn bản đã được làm sạch và khử chữ Hán 100%
        const finalTranslated = audit.cleanedText || translatedTextRaw;

        if (audit.healedActions.length > 0) {
          addLog(
            `🛠️ [Tự Sửa Offline] Chương ${chapIndex + 1}: ${audit.healedActions.join(', ')}`,
            'info'
          );
        }

        // Nếu dính lỗi nặng:
        if (audit.hasCriticalError) {
          const criticalMessages = audit.issues
            .filter((i) => i.severity === 'critical')
            .map((i) => i.message)
            .join(' | ');

          if (attempt < maxAttempts && autoRetry) {
            addLog(
              `⚠️ Phát hiện lỗi nặng tại Chương ${chapIndex + 1}: [${criticalMessages}]. Chuẩn bị gửi lại...`,
              'warning'
            );
            await new Promise((resolve) => setTimeout(resolve, 2000));
            continue; // Thử lại ngay lập tức
          } else {
            // Đã hết số lần thử lại -> Lưu lại nhưng gắn cờ lỗi để người dùng biết
            addLog(
              `❌ Chương ${chapIndex + 1} vẫn có lỗi sau ${attempt} lần thử: [${criticalMessages}]. Đã gắn cờ lỗi.`,
              'error'
            );
          }
        }

        // Lưu bản dịch chương (đã sạch 100%)
        const updatedChapters = {
          ...projectDataRef.current.translatedChapters,
          [chapIndex]: finalTranslated,
        };

        const auditInfo: ChapterAuditInfo = {
          score: audit.score,
          status: audit.hasCriticalError ? 'critical' : audit.hasMildError ? 'healed' : 'good',
          issues: audit.issues.map((i) => i.message),
          healedActions: audit.healedActions,
          timestamp: new Date().toLocaleTimeString(),
        };

        const updatedAuditStatus = {
          ...(projectDataRef.current.chapterAuditStatus || {}),
          [chapIndex]: auditInfo,
        };

        const updatedData: ProjectData = {
          ...projectDataRef.current,
          translatedChapters: updatedChapters,
          masterGlossary: sanitizedGlossary,
          chapterAuditStatus: updatedAuditStatus,
        };

        setProjectData(updatedData);
        projectDataRef.current = updatedData;

        if (!audit.hasCriticalError) {
          addLog(`✅ Hoàn tất Chương ${chapIndex + 1} (Chất lượng: ${audit.score}/100đ)`, 'success');
          chapterResolved = true;
          return true;
        } else {
          chapterResolved = true;
          return false;
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        addLog(`❌ Ngoại lệ chương ${chapIndex + 1}: ${errorMsg}`, 'error');
        if (attempt < maxAttempts && autoRetry) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        } else {
          break;
        }
      }
    }

    return false;
  };

  const startRangeTranslation = async (fromChap: number, toChap: number) => {
    if (apiKeys.length === 0) {
      alert('Vui lòng thêm ít nhất 1 Gemini API Key ở Tab 1!');
      return;
    }

    const startIdx = Math.max(0, fromChap - 1);
    const endIdx = Math.min(projectData.rawChapters.length - 1, toChap - 1);

    if (startIdx > endIdx) {
      alert('Khoảng chương không hợp lệ!');
      return;
    }

    isTranslatingRef.current = true;
    isPausedRef.current = false;
    setIsTranslating(true);
    setIsPaused(false);

    addLog(
      `🚀 Bắt đầu tiến trình dịch tự động từ Chương ${fromChap} đến Chương ${toChap}...`,
      'info'
    );

    for (let i = startIdx; i <= endIdx; i++) {
      if (!isTranslatingRef.current) {
        addLog('⏹ Tiến trình dịch đã bị hủy bởi người dùng.', 'warning');
        break;
      }

      // Handle pause loop
      while (isPausedRef.current && isTranslatingRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      if (!isTranslatingRef.current) break;

      setCurrentTranslatingIndex(i);
      await translateSingleChapterWithAudit(i);

      // Delay between chapters
      if (i < endIdx && isTranslatingRef.current) {
        const delay = Math.max(1, settingsRef.current.delaySec || 2);
        await new Promise((resolve) => setTimeout(resolve, delay * 1000));
      }
    }

    isTranslatingRef.current = false;
    setIsTranslating(false);
    addLog('🎉 Đã hoàn thành dải chương được chỉ định!', 'success');
  };

  const handleTogglePause = () => {
    const nextPaused = !isPaused;
    setIsPaused(nextPaused);
    isPausedRef.current = nextPaused;
    addLog(nextPaused ? '⏸ Đã tạm dừng tiến trình dịch.' : '▶ Tiếp tục tiến trình dịch...', 'warning');
  };

  const handleCancelTranslation = () => {
    isTranslatingRef.current = false;
    isPausedRef.current = false;
    setIsTranslating(false);
    setIsPaused(false);
    addLog('⏹ Đã yêu cầu dừng toàn bộ tiến trình dịch.', 'warning');
  };

  /**
   * Quét toàn bộ các chương đã dịch bằng bộ Offline Auditor (0% Token)
   */
  const handleScanAllChaptersQuality = () => {
    const translatedMap = projectData.translatedChapters;
    const totalTranslated = Object.keys(translatedMap).length;

    if (totalTranslated === 0) {
      alert('Chưa có chương nào được dịch để kiểm định!');
      return;
    }

    setIsScanningQuality(true);
    addLog(`🔍 Bắt đầu quét kiểm định Offline toàn bộ ${totalTranslated} chương...`, 'info');

    const updatedAuditStatus: Record<number, ChapterAuditInfo> = {};
    let countGood = 0;
    let countHealed = 0;
    let countCritical = 0;

    for (const [idxStr, transText] of Object.entries(translatedMap)) {
      const idx = Number(idxStr);
      const rawText = projectData.rawChapters[idx] || '';

      const audit = ChapterAuditor.auditChapter(rawText, transText, projectData.masterGlossary);

      if (audit.hasCriticalError) {
        countCritical++;
        updatedAuditStatus[idx] = {
          score: audit.score,
          status: 'critical',
          issues: audit.issues.map((i) => i.message),
          healedActions: audit.healedActions,
          timestamp: new Date().toLocaleTimeString(),
        };
      } else if (audit.hasMildError || audit.healedActions.length > 0) {
        countHealed++;
        updatedAuditStatus[idx] = {
          score: audit.score,
          status: 'healed',
          issues: audit.issues.map((i) => i.message),
          healedActions: audit.healedActions,
          timestamp: new Date().toLocaleTimeString(),
        };
      } else {
        countGood++;
        updatedAuditStatus[idx] = {
          score: audit.score,
          status: 'good',
          issues: [],
          timestamp: new Date().toLocaleTimeString(),
        };
      }
    }

    const updatedData: ProjectData = {
      ...projectData,
      chapterAuditStatus: updatedAuditStatus,
    };

    setProjectData(updatedData);
    projectDataRef.current = updatedData;
    setIsScanningQuality(false);

    addLog(
      `🎯 Kết quả quét ${totalTranslated} chương: ${countGood} chương Tốt, ${countHealed} chương Đã sửa offline, ${countCritical} chương Lỗi nặng.`,
      countCritical > 0 ? 'warning' : 'success'
    );
  };

  /**
   * Tự động lọc ra tất cả các chương bị lỗi nặng và yêu cầu Gemini dịch lại để ghi đè
   */
  const handleRetranslateErrorChapters = async () => {
    const auditMap = projectData.chapterAuditStatus || {};
    const errorIndices = Object.keys(projectData.translatedChapters)
      .map(Number)
      .filter((idx) => auditMap[idx]?.status === 'critical');

    if (errorIndices.length === 0) {
      alert('Không có chương nào bị đánh dấu Lỗi nặng cần dịch lại!');
      return;
    }

    const confirmed = window.confirm(
      `Tìm thấy ${errorIndices.length} chương lỗi nặng. Bạn có muốn bắt đầu tự động gửi Gemini dịch lại toàn bộ các chương này và ghi đè không?`
    );
    if (!confirmed) return;

    isTranslatingRef.current = true;
    isPausedRef.current = false;
    setIsTranslating(true);
    setIsPaused(false);

    addLog(`🔄 Bắt đầu chu trình dịch lại ${errorIndices.length} chương bị lỗi nặng...`, 'info');

    for (const idx of errorIndices) {
      if (!isTranslatingRef.current) break;
      while (isPausedRef.current && isTranslatingRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      if (!isTranslatingRef.current) break;

      setCurrentTranslatingIndex(idx);
      await translateSingleChapterWithAudit(idx);

      if (isTranslatingRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    isTranslatingRef.current = false;
    setIsTranslating(false);
    addLog(`🎉 Đã hoàn tất sửa chữa và dịch lại ${errorIndices.length} chương lỗi!`, 'success');
  };

  /**
   * Sửa chữa 1 chương duy nhất Offline (0% Token)
   */
  const handleHealSingleChapterOffline = (chapIndex: number) => {
    const transText = projectData.translatedChapters[chapIndex];
    if (!transText) return;

    const rawText = projectData.rawChapters[chapIndex] || '';
    const { cleaned, healedActions } = ChapterAuditor.cleanChapterOffline(
      transText,
      projectData.masterGlossary
    );
    const audit = ChapterAuditor.auditChapter(rawText, cleaned, projectData.masterGlossary);

    const updatedChapters = {
      ...projectData.translatedChapters,
      [chapIndex]: cleaned,
    };

    const updatedAuditStatus = {
      ...(projectData.chapterAuditStatus || {}),
      [chapIndex]: {
        score: audit.score,
        status: audit.hasCriticalError ? ('critical' as const) : ('healed' as const),
        issues: audit.issues.map((i) => i.message),
        healedActions,
        timestamp: new Date().toLocaleTimeString(),
      },
    };

    const updated = {
      ...projectData,
      translatedChapters: updatedChapters,
      chapterAuditStatus: updatedAuditStatus,
    };

    setProjectData(updated);
    projectDataRef.current = updated;

    if (healedActions.length > 0) {
      addLog(`🛠️ Đã sửa offline Chương ${chapIndex + 1}: ${healedActions.join(', ')}`, 'success');
      alert(`Đã sửa offline thành công!\n\n${healedActions.join('\n')}`);
    } else {
      alert(`Chương ${chapIndex + 1} đã sạch, không phát hiện rác hay câu thừa.`);
    }
  };

  /**
   * Dịch lại 1 chương duy nhất bằng Gemini và ghi đè
   */
  const handleRetranslateSingleChapter = async (chapIndex: number) => {
    if (apiKeys.length === 0) {
      alert('Vui lòng thêm ít nhất 1 Gemini API Key ở Tab 1!');
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn yêu cầu Gemini dịch lại Chương ${chapIndex + 1} và ghi đè bản dịch cũ không?`
    );
    if (!confirmed) return;

    isTranslatingRef.current = true;
    setIsTranslating(true);
    setCurrentTranslatingIndex(chapIndex);

    await translateSingleChapterWithAudit(chapIndex);

    isTranslatingRef.current = false;
    setIsTranslating(false);
    addLog(`✅ Đã hoàn tất dịch lại Chương ${chapIndex + 1}!`, 'success');
  };

  // Export Full Novel Modal
  const handleExportFullNovel = () => {
    const transKeys = Object.keys(projectData.translatedChapters);
    if (transKeys.length === 0) {
      alert('Chưa có chương nào được dịch để xuất!');
      return;
    }
    window.history.pushState({ modal: 'exportNovel' }, '');
    setIsExportModalOpen(true);
  };

  // Download Full Source Code Zip
  const handleDownloadSourceCode = async () => {
    try {
      addLog('📦 Đang đóng gói toàn bộ mã nguồn React SPA thành file .zip...', 'info');
      await downloadSourceCodeZip();
      addLog('🎉 Đã tải xuống gói mã nguồn DroidTranslator_Full_Source.zip!', 'success');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      addLog(`❌ Lỗi đóng gói source code: ${errorMsg}`, 'error');
      alert(`Lỗi đóng gói source code: ${errorMsg}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header with Safe Area Inset */}
      <Header
        settings={settings}
        apiKeys={apiKeys}
        onOpenProjectModal={() => openProjectSwitchModal('switch')}
        onDownloadSourceCode={handleDownloadSourceCode}
      />

      {/* Main Container with Safe Area Padding */}
      <main
        className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-6 pb-28 sm:pb-32"
        style={{
          paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
        }}
      >
        {activeTab === 0 && (
          <TabKeys
            settings={settings}
            apiKeys={apiKeys}
            promptCards={promptCards}
            engine={engineRef.current}
            onUpdateSettings={handleUpdateSettings}
            onUpdateKeys={setApiKeys}
            onUpdatePrompts={setPromptCards}
            onOpenPromptModal={(p) => openPromptEditModal(p || undefined)}
            onAddLog={addLog}
          />
        )}

        {activeTab === 1 && (
          <TabTranslate
            settings={settings}
            projectData={projectData}
            logs={logs}
            isTranslating={isTranslating}
            isPaused={isPaused}
            currentTranslatingIndex={currentTranslatingIndex}
            onUpdateProjectData={handleUpdateProjectData}
            onStartRangeTranslation={startRangeTranslation}
            onTogglePause={handleTogglePause}
            onCancelTranslation={handleCancelTranslation}
            onOpenProjectModal={() => openProjectSwitchModal('switch')}
            onOpenNewProjectModal={() => openProjectSwitchModal('new')}
            onOpenFullGlossary={openFullGlossaryModal}
            onOpenEditGlossaryModal={(raw, vi) => openEditGlossaryTermModal(raw, vi)}
            onAddLog={addLog}
          />
        )}

        {activeTab === 2 && (
          <TabReader
            projectData={projectData}
            isTranslating={isTranslating}
            currentTranslatingIndex={currentTranslatingIndex}
            isScanningQuality={isScanningQuality}
            onOpenReader={(idx) => openReaderModal(idx)}
            onExportFullNovel={handleExportFullNovel}
            onScanAllQuality={handleScanAllChaptersQuality}
            onRetranslateErrors={handleRetranslateErrorChapters}
          />
        )}

        {activeTab === 3 && (
          <TabSettings
            settings={settings}
            projectData={projectData}
            onUpdateSettings={handleUpdateSettings}
            onOpenProjectModal={() => openProjectSwitchModal('switch')}
            onOpenNewProjectModal={() => openProjectSwitchModal('new')}
            onDeleteCurrentProject={handleDeleteCurrentProject}
            onExportFullNovel={handleExportFullNovel}
            onDownloadSourceCode={handleDownloadSourceCode}
            onAddLog={addLog}
          />
        )}
      </main>

      {/* Bottom Fixed Tab Navigation with Android Safe-Area Inset Support */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#141414] border-t border-[#222] backdrop-blur-md shadow-lg"
        style={{
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))',
          paddingLeft: 'max(0.5rem, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(0.5rem, env(safe-area-inset-right, 0px))',
        }}
      >
        <div className="max-w-md mx-auto grid grid-cols-4 py-2 px-1">
          <button
            onClick={() => switchTab(0)}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-lg transition cursor-pointer ${
              activeTab === 0 ? 'text-blue-400 font-bold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <KeyRound className="w-4 h-4 mb-0.5" />
            <span className="text-[11px] truncate">Key &amp; Prompt</span>
          </button>

          <button
            onClick={() => switchTab(1)}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-lg transition cursor-pointer relative ${
              activeTab === 1 ? 'text-blue-400 font-bold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {isTranslating && (
              <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            )}
            <Play className="w-4 h-4 mb-0.5" />
            <span className="text-[11px] truncate">Dịch &amp; Từ điển</span>
          </button>

          <button
            onClick={() => switchTab(2)}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-lg transition cursor-pointer ${
              activeTab === 2 ? 'text-blue-400 font-bold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <BookOpen className="w-4 h-4 mb-0.5" />
            <span className="text-[11px] truncate">Bản dịch &amp; Đọc</span>
          </button>

          <button
            onClick={() => switchTab(3)}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-lg transition cursor-pointer ${
              activeTab === 3 ? 'text-blue-400 font-bold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Settings className="w-4 h-4 mb-0.5" />
            <span className="text-[11px] truncate">Cài đặt</span>
          </button>
        </div>
      </nav>

      {/* Fullscreen AMOLED/Sepia Reader Modal */}
      {readerChapterIndex !== null && (
        <FullScreenReaderModal
          projectData={projectData}
          chapterIndex={readerChapterIndex}
          onClose={handleCloseActiveModal}
          onNavigateChapter={(newIdx) => setReaderChapterIndex(newIdx)}
          onHealCurrentChapterOffline={handleHealSingleChapterOffline}
          onRetranslateCurrentChapter={handleRetranslateSingleChapter}
        />
      )}

      {/* Full Glossary Modal */}
      {isFullGlossaryOpen && (
        <FullGlossaryModal
          projectData={projectData}
          onClose={handleCloseActiveModal}
          onUpdateGlossary={(updated) => handleUpdateProjectData({ masterGlossary: updated })}
          onOpenEditModal={(raw, vi) => openEditGlossaryTermModal(raw, vi)}
          onExportGlossary={() => {
            const lines = Object.entries(projectData.masterGlossary).map(([k, v]) => `${k}=${v}`);
            navigator.clipboard.writeText(lines.join('\n'));
            alert(`Đã sao chép ${lines.length} thuật ngữ vào Clipboard!`);
          }}
        />
      )}

      {/* Edit Glossary Entry Modal */}
      {editingGlossaryPair && (
        <EditGlossaryModal
          initialRaw={editingGlossaryPair.raw}
          initialVi={editingGlossaryPair.vi}
          onClose={handleCloseActiveModal}
          onSave={(oldRaw, newRaw, newVi) => {
            const updated = { ...projectData.masterGlossary };
            if (oldRaw !== newRaw) delete updated[oldRaw];
            updated[newRaw] = newVi;
            handleUpdateProjectData({ masterGlossary: updated });
            addLog(`✏️ Đã cập nhật thuật ngữ: [${oldRaw}] ➔ [${newRaw} = ${newVi}]`, 'success');
          }}
        />
      )}

      {/* Prompt Card Add/Edit Modal */}
      {editingPrompt !== undefined && (
        <PromptModal
          editingPrompt={editingPrompt}
          onClose={handleCloseActiveModal}
          onSave={(title, content) => {
            if (editingPrompt) {
              const updated = promptCards.map((p) =>
                p.id === editingPrompt.id ? { ...p, title, content } : p
              );
              setPromptCards(updated);
              addLog(`✏️ Đã cập nhật thẻ prompt: ${title}`, 'success');
            } else {
              const newCard: PromptCardItem = {
                id: Date.now(),
                title,
                content,
                active: true,
              };
              const updated = promptCards.map((p) => ({ ...p, active: false }));
              setPromptCards([...updated, newCard]);
              addLog(`➕ Đã tạo thẻ prompt mới: ${title}`, 'success');
            }
          }}
        />
      )}

      {/* Project Switch / New Modal */}
      {projectModalMode !== null && (
        <ProjectModal
          mode={projectModalMode}
          currentProject={settings.currentProjectName}
          projectList={settings.projectList}
          onClose={handleCloseActiveModal}
          onSelectProject={handleSelectProject}
          onCreateProject={handleCreateProject}
        />
      )}

      {/* Export Novel To Storage Modal */}
      {isExportModalOpen && (
        <ExportNovelModal
          projectData={projectData}
          modelName={settings.currentModel}
          onClose={handleCloseActiveModal}
          onAddLog={(text, type) => addLog(text, type)}
        />
      )}

      {/* Native Android Double-Back Exit Toast */}
      {showExitToast && (
        <div className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-fade-in">
          <div className="bg-[#222222]/95 text-white text-xs sm:text-sm font-medium px-4 py-2 rounded-full shadow-2xl border border-gray-700/70 backdrop-blur-md flex items-center gap-2">
            <span>Vuốt hoặc bấm trở về lần nữa để thoát</span>
          </div>
        </div>
      )}
    </div>
  );
};
