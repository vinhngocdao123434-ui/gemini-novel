import React, { useState, useEffect, useRef } from 'react';
import { KeyRound, Play, BookOpen, Settings } from 'lucide-react';
import { ApiKeyItem, AppSettings, LogMessage, ProjectData, PromptCardItem, ChapterAuditInfo } from './types';
import {
  loadSettings,
  saveSettings,
  loadApiKeys,
  saveApiKeys,
  loadPromptCards,
  savePromptCards,
  loadProjectData,
  saveProjectData,
  deleteProjectFromStorage,
  getInitialProjectData,
} from './utils/storage';
import { GeminiEngine } from './utils/geminiEngine';
import { GlossaryManager } from './utils/glossaryManager';
import { ChapterAuditor } from './utils/chapterAuditor';
import { downloadSourceCodeZip } from './utils/sourceExporter';
import { RootBridge } from './utils/rootBridge';
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
      text: '🚀 DroidTranslator Native V10.2: Tích hợp Bộ Kiểm Định Chất Lượng & Tự Sửa Offline Sẵn Sàng!',
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

  // Refs for translation engine and loop control
  const engineRef = useRef<GeminiEngine>(new GeminiEngine(apiKeys));
  const isTranslatingRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const projectDataRef = useRef<ProjectData>(projectData);
  const settingsRef = useRef<AppSettings>(settings);
  const promptCardsRef = useRef<PromptCardItem[]>(promptCards);

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
    saveProjectData(initial);
    addLog(`📁 Đã tạo và chuyển sang dự án mới: ${name}`, 'success');
  };

  const handleDeleteCurrentProject = () => {
    if (settings.projectList.length <= 1) {
      alert('Không thể xóa dự án duy nhất còn lại!');
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa dự án [${settings.currentProjectName}]?\n\n• Toàn bộ chương thô, bản dịch và từ điển riêng của truyện này sẽ bị xóa khỏi bộ nhớ máy.\n• Toàn bộ kho Key API và Thẻ Prompt sẽ ĐƯỢC BẢO TOÀN VĨNH CỬU 100%!`
    );

    if (!confirmed) return;

    const toDelete = settings.currentProjectName;
    deleteProjectFromStorage(toDelete);
    const remaining = settings.projectList.filter((p) => p !== toDelete);
    const nextProj = remaining[0];

    setSettings((prev) => ({
      ...prev,
      currentProjectName: nextProj,
      projectList: remaining,
    }));

    const nextData = loadProjectData(nextProj);
    setProjectData(nextData);
    addLog(
      `🗑️ Đã xóa vĩnh viễn dự án: ${toDelete}. Toàn bộ Key API và Prompt được bảo toàn 100%!`,
      'warning'
    );
  };

  /**
   * Dịch một chương đơn lẻ kèm kiểm tra lỗi Offline và Auto-Retry ghi đè khi dính lỗi nặng
   */
  const translateSingleChapterWithAudit = async (chapIndex: number): Promise<boolean> => {
    const rawText = projectDataRef.current.rawChapters[chapIndex];
    if (!rawText) return false;

    const model = settingsRef.current.currentModel;
    const targetLang = settingsRef.current.targetLanguage;
    const antiHanzi = settingsRef.current.antiHanziStrict;
    const minLen = settingsRef.current.minTermLength;
    const minFreq = settingsRef.current.minFrequency;
    const conflict = settingsRef.current.conflictPolicy;
    const autoHeal = settingsRef.current.autoHealOffline;
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
      if (prevText && prevText.trim().length > 0) {
        const takeLen = Math.min(prevText.length, 350);
        prevSnippet = '...' + prevText.substring(prevText.length - takeLen).trim();
      }
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

        // Bóc tách thuật ngữ mới
        const currentGlossary = { ...projectDataRef.current.masterGlossary };
        const newlyAdded = GlossaryManager.mergeNewEntries(
          currentGlossary,
          newGlossaryBlock,
          rawText,
          minLen,
          minFreq,
          conflict
        );

        // Chạy kiểm tra chất lượng Offline (0% Token)
        const audit = ChapterAuditor.auditChapter(rawText, translatedTextRaw, currentGlossary);

        let finalTranslated = translatedTextRaw;

        // Nếu có lỗi nhẹ và bật Auto-Heal: Áp dụng văn bản đã dọn sạch
        if (autoHeal && audit.healedActions.length > 0) {
          finalTranslated = audit.cleanedText;
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

        // Lưu bản dịch chương (dù hoàn hảo hay đã sửa, hoặc cần đánh dấu cờ lỗi)
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
          masterGlossary: currentGlossary,
          chapterAuditStatus: updatedAuditStatus,
        };

        setProjectData(updatedData);
        projectDataRef.current = updatedData;

        if (newlyAdded.length > 0) {
          const names = newlyAdded.map((e) => `[${e.key} ➔ ${e.value}]`).join(' ');
          addLog(`📚 Đã tự học ${newlyAdded.length} từ mới: ${names}`, 'success');
        }

        if (!audit.hasCriticalError) {
          addLog(`✅ Hoàn tất Chương ${chapIndex + 1} (Chất lượng: ${audit.score}/100đ)`, 'success');
          chapterResolved = true;
          return true;
        } else {
          chapterResolved = true; // Kết thúc chu kỳ cho chương này
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

  // Translation Loop
  const startRangeTranslation = async (fromChap: number, toChap: number) => {
    if (projectDataRef.current.rawChapters.length === 0) {
      alert('Vui lòng nạp và tách chương trước!');
      return;
    }

    if (apiKeys.length === 0) {
      alert('Vui lòng thêm ít nhất 1 Gemini API Key ở Tab 1 (Key & Prompt)!');
      setActiveTab(0);
      return;
    }

    isTranslatingRef.current = true;
    isPausedRef.current = false;
    setIsTranslating(true);
    setIsPaused(false);

    // Kích hoạt WakeLock giữ CPU luôn thức chống Deep Sleep khi tắt màn hình
    RootBridge.acquireWakeLock().catch(() => {});

    let currentIdx = fromChap - 1;
    const targetEndIdx = toChap;

    addLog(`▶ Bắt đầu dịch Range: Chương ${fromChap} ➔ Chương ${toChap}...`, 'info');

    while (
      isTranslatingRef.current &&
      currentIdx < targetEndIdx &&
      currentIdx < projectDataRef.current.rawChapters.length
    ) {
      if (isPausedRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }

      setCurrentTranslatingIndex(currentIdx);
      await translateSingleChapterWithAudit(currentIdx);

      currentIdx++;
      const delay = settingsRef.current.delaySec || 2;
      await new Promise((resolve) => setTimeout(resolve, delay * 1000));
    }

    if (currentIdx >= targetEndIdx) {
      addLog(`🎉 Đã hoàn thành khoảng chương yêu cầu!`, 'success');
    }

    RootBridge.releaseWakeLock().catch(() => {});
    isTranslatingRef.current = false;
    isPausedRef.current = false;
    setIsTranslating(false);
    setIsPaused(false);
  };

  const handleTogglePause = () => {
    const nextPaused = !isPaused;
    isPausedRef.current = nextPaused;
    setIsPaused(nextPaused);
    if (nextPaused) {
      RootBridge.releaseWakeLock().catch(() => {});
      addLog(`⏸ Đã tạm dừng tại Chương ${currentTranslatingIndex + 1}.`, 'warning');
    } else {
      RootBridge.acquireWakeLock().catch(() => {});
      addLog(`▶ Tiếp tục dịch lại Chương ${currentTranslatingIndex + 1}...`, 'info');
    }
  };

  const handleCancelTranslation = () => {
    RootBridge.releaseWakeLock().catch(() => {});
    isTranslatingRef.current = false;
    isPausedRef.current = false;
    setIsTranslating(false);
    setIsPaused(false);
    addLog(`⏹ Đã hủy tiến trình dịch.`, 'warning');
  };

  /**
   * Quét kiểm định chất lượng toàn bộ các chương đã dịch Offline (100% không tốn token)
   */
  const handleScanAllChaptersQuality = () => {
    const translatedMap = projectData.translatedChapters;
    const totalTranslated = Object.keys(translatedMap).length;
    if (totalTranslated === 0) {
      alert('Chưa có chương nào được dịch trong dự án này!');
      return;
    }

    setIsScanningQuality(true);
    addLog(`🔍 Đang quét kiểm định chất lượng offline toàn bộ ${totalTranslated} chương...`, 'info');

    const updatedAuditStatus: Record<number, ChapterAuditInfo> = {
      ...(projectData.chapterAuditStatus || {}),
    };
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
      alert('Không có chương nào bị lỗi nặng! Toàn bộ bản dịch đều đạt chuẩn.');
      return;
    }

    if (apiKeys.length === 0) {
      alert('Vui lòng thêm ít nhất 1 Gemini API Key ở Tab 1 để dịch lại!');
      setActiveTab(0);
      return;
    }

    const confirmed = window.confirm(
      `Tìm thấy ${errorIndices.length} chương bị lỗi nặng (Chương: ${errorIndices
        .map((i) => i + 1)
        .join(', ')}).\n\nBạn có muốn tự động gửi Gemini dịch lại để ghi đè toàn bộ các chương này không?`
    );

    if (!confirmed) return;

    isTranslatingRef.current = true;
    setIsTranslating(true);
    addLog(`⚡ Bắt đầu tiến trình dịch lại ${errorIndices.length} chương lỗi để ghi đè...`, 'warning');

    for (const idx of errorIndices) {
      if (!isTranslatingRef.current) break;
      setCurrentTranslatingIndex(idx);
      await translateSingleChapterWithAudit(idx);
      const delay = settingsRef.current.delaySec || 2;
      await new Promise((resolve) => setTimeout(resolve, delay * 1000));
    }

    isTranslatingRef.current = false;
    setIsTranslating(false);
    addLog(`🎉 Đã hoàn tất tiến trình dịch lại các chương lỗi!`, 'success');
  };

  /**
   * Sửa lỗi offline cho 1 chương duy nhất
   */
  const handleHealSingleChapterOffline = (chapIndex: number) => {
    const rawText = projectData.rawChapters[chapIndex] || '';
    const transText = projectData.translatedChapters[chapIndex] || '';
    if (!transText) return;

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

  // Export Full Novel
  const handleExportFullNovel = () => {
    const transKeys = Object.keys(projectData.translatedChapters)
      .map(Number)
      .sort((a, b) => a - b);

    if (transKeys.length === 0) {
      alert('Chưa có chương nào được dịch để xuất!');
      return;
    }

    const nl = '\n';
    let fullText = `=== TOÀN VĂN TÁC PHẨM: ${projectData.projectName} ===${nl}`;
    fullText += `Biên dịch bởi: DroidTranslator Native${nl}`;
    fullText += `Mô hình: ${settings.currentModel}${nl}`;
    fullText += `Tổng số chương đã dịch: ${transKeys.length}${nl}${nl}`;

    for (const idx of transKeys) {
      fullText += `============================================================${nl}`;
      fullText += projectData.translatedChapters[idx] + nl + nl;
    }

    // Trigger download
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectData.projectName}_FULL_TRANSLATED.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    navigator.clipboard.writeText(fullText);
    addLog(`📁 Đã xuất và tải xuống tệp: ${projectData.projectName}_FULL_TRANSLATED.txt`, 'success');
    alert(
      `Đã xuất toàn văn tác phẩm ${transKeys.length} chương thành công! File đã được tải xuống và nội dung đã sao chép vào Clipboard.`
    );
  };

  // Download Full Source Code Zip
  const handleDownloadSourceCode = async () => {
    try {
      addLog('📦 Đang đóng gói toàn bộ mã nguồn React + Vite + TypeScript...', 'info');
      await downloadSourceCodeZip();
      addLog('🎉 Đã tải xuống thành công file droidtranslator-web-source.zip!', 'success');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      addLog(`❌ Lỗi đóng gói mã nguồn: ${errorMsg}`, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 flex flex-col font-sans">
      {/* Top Header Bar */}
      <Header
        settings={settings}
        apiKeys={apiKeys}
        onOpenProjectModal={() => setProjectModalMode('switch')}
        onDownloadSourceCode={handleDownloadSourceCode}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-6 pb-24 sm:pb-28">
        {activeTab === 0 && (
          <TabKeys
            settings={settings}
            apiKeys={apiKeys}
            promptCards={promptCards}
            engine={engineRef.current}
            onUpdateSettings={handleUpdateSettings}
            onUpdateKeys={setApiKeys}
            onUpdatePrompts={setPromptCards}
            onOpenPromptModal={(p) => setEditingPrompt(p || null)}
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
            onOpenProjectModal={() => setProjectModalMode('switch')}
            onOpenNewProjectModal={() => setProjectModalMode('new')}
            onOpenFullGlossary={() => setIsFullGlossaryOpen(true)}
            onOpenEditGlossaryModal={(raw, vi) => setEditingGlossaryPair({ raw, vi })}
            onAddLog={addLog}
          />
        )}

        {activeTab === 2 && (
          <TabReader
            projectData={projectData}
            isTranslating={isTranslating}
            currentTranslatingIndex={currentTranslatingIndex}
            isScanningQuality={isScanningQuality}
            onOpenReader={(idx) => setReaderChapterIndex(idx)}
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
            onOpenProjectModal={() => setProjectModalMode('switch')}
            onOpenNewProjectModal={() => setProjectModalMode('new')}
            onDeleteCurrentProject={handleDeleteCurrentProject}
            onExportFullNovel={handleExportFullNovel}
            onDownloadSourceCode={handleDownloadSourceCode}
            onAddLog={addLog}
          />
        )}
      </main>

      {/* Bottom Fixed Tab Navigation (matching exact 4 tabs of original app) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#141414] border-t border-[#222] backdrop-blur-md shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-4 py-2 px-1">
          <button
            onClick={() => setActiveTab(0)}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-lg transition cursor-pointer ${
              activeTab === 0 ? 'text-blue-400 font-bold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <KeyRound className="w-4 h-4 mb-0.5" />
            <span className="text-[11px] truncate">Key &amp; Prompt</span>
          </button>

          <button
            onClick={() => setActiveTab(1)}
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
            onClick={() => setActiveTab(2)}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-lg transition cursor-pointer ${
              activeTab === 2 ? 'text-blue-400 font-bold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <BookOpen className="w-4 h-4 mb-0.5" />
            <span className="text-[11px] truncate">Bản dịch &amp; Đọc</span>
          </button>

          <button
            onClick={() => setActiveTab(3)}
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
          onClose={() => setReaderChapterIndex(null)}
          onNavigateChapter={(newIdx) => setReaderChapterIndex(newIdx)}
          onHealCurrentChapterOffline={handleHealSingleChapterOffline}
          onRetranslateCurrentChapter={handleRetranslateSingleChapter}
        />
      )}

      {/* Full Glossary Modal */}
      {isFullGlossaryOpen && (
        <FullGlossaryModal
          projectData={projectData}
          onClose={() => setIsFullGlossaryOpen(false)}
          onUpdateGlossary={(updated) => handleUpdateProjectData({ masterGlossary: updated })}
          onOpenEditModal={(raw, vi) => setEditingGlossaryPair({ raw, vi })}
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
          onClose={() => setEditingGlossaryPair(null)}
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
          onClose={() => setEditingPrompt(undefined)}
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
          onClose={() => setProjectModalMode(null)}
          onSelectProject={handleSelectProject}
          onCreateProject={handleCreateProject}
        />
      )}
    </div>
  );
};
