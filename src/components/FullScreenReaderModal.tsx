import React, { useState, useEffect } from 'react';
import { X, Copy, ChevronLeft, ChevronRight, Check, Wrench, AlertTriangle, RotateCcw } from 'lucide-react';
import { ProjectData, ReaderTheme, ReaderMode } from '../types';

interface FullScreenReaderModalProps {
  projectData: ProjectData;
  chapterIndex: number;
  onClose: () => void;
  onNavigateChapter: (newIndex: number) => void;
  onHealCurrentChapterOffline?: (index: number) => void;
  onRetranslateCurrentChapter?: (index: number) => void;
}

export const FullScreenReaderModal: React.FC<FullScreenReaderModalProps> = ({
  projectData,
  chapterIndex,
  onClose,
  onNavigateChapter,
  onHealCurrentChapterOffline,
  onRetranslateCurrentChapter,
}) => {
  const [theme, setTheme] = useState<ReaderTheme>('amoled');
  const [mode, setMode] = useState<ReaderMode>('translated');
  const [fontSize, setFontSize] = useState<number>(16);
  const [copied, setCopied] = useState<boolean>(false);

  const total = projectData.rawChapters.length;
  const currentRaw = projectData.rawChapters[chapterIndex] || '';
  const currentTrans = projectData.translatedChapters[chapterIndex] || '(Chưa có bản dịch cho chương này)';
  const auditInfo = projectData.chapterAuditStatus?.[chapterIndex];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && chapterIndex > 0) onNavigateChapter(chapterIndex - 1);
      if (e.key === 'ArrowRight' && chapterIndex < total - 1) onNavigateChapter(chapterIndex + 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chapterIndex, total, onClose, onNavigateChapter]);

  const getDisplayText = (): string => {
    if (mode === 'translated') {
      return currentTrans;
    } else if (mode === 'original') {
      return currentRaw;
    } else {
      return `=== BẢN DỊCH TIẾNG VIỆT ===\n\n${currentTrans}\n\n=== NGUYÊN TÁC GỐC ===\n\n${currentRaw}`;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getDisplayText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Theme styling
  let containerBg = 'bg-black text-gray-200';
  let barBg = 'bg-[#111111] border-[#222222] text-gray-200';
  let buttonActive = 'bg-blue-600 text-white';
  let buttonInactive = 'bg-[#1e293b] text-gray-300 hover:bg-[#283548]';

  if (theme === 'sepia') {
    containerBg = 'bg-[#fbf0d9] text-[#3d2e1e]';
    barBg = 'bg-[#f2e2c2] border-[#e2cfab] text-[#3d2e1e]';
    buttonActive = 'bg-[#8c5e32] text-white';
    buttonInactive = 'bg-[#e5d4b5] text-[#3d2e1e] hover:bg-[#d6c4a3]';
  } else if (theme === 'light') {
    containerBg = 'bg-white text-gray-900';
    barBg = 'bg-gray-100 border-gray-200 text-gray-900';
    buttonActive = 'bg-blue-600 text-white';
    buttonInactive = 'bg-gray-200 text-gray-800 hover:bg-gray-300';
  }

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${containerBg} animate-fade-in`}>
      {/* 1. Reader Top Bar */}
      <div className={`px-4 py-3 border-b flex items-center justify-between shadow-sm ${barBg}`}>
        <div className="flex items-center gap-2 min-w-0 pr-2">
          <h2 className="text-sm sm:text-base font-bold truncate">
            {projectData.projectName} · Chương {chapterIndex + 1} / {total}
          </h2>

          {auditInfo && (
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                auditInfo.status === 'critical'
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : auditInfo.status === 'healed'
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}
            >
              Chất lượng: {auditInfo.score}/100đ
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onHealCurrentChapterOffline && (
            <button
              onClick={() => onHealCurrentChapterOffline(chapterIndex)}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-teal-800 hover:bg-teal-700 text-white transition flex items-center gap-1 cursor-pointer"
              title="Tự động dọn sạch rác, câu chào AI và sửa lỗi chính tả offline"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sửa Offline</span>
            </button>
          )}

          {onRetranslateCurrentChapter && (
            <button
              onClick={() => onRetranslateCurrentChapter(chapterIndex)}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-600 text-white transition flex items-center gap-1 cursor-pointer"
              title="Gửi Gemini dịch lại chương này và ghi đè"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dịch Lại</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${buttonInactive}`}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-900/50 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Reader Secondary Toolbar (Modes, Themes, Font Size) */}
      <div className={`px-4 py-2 border-b flex flex-wrap items-center justify-between gap-2 text-xs ${barBg}`}>
        {/* Mode Selector */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMode('translated')}
            className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
              mode === 'translated' ? buttonActive : buttonInactive
            }`}
          >
            Tiếng Việt
          </button>
          <button
            onClick={() => setMode('bilingual')}
            className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
              mode === 'bilingual' ? buttonActive : buttonInactive
            }`}
          >
            Song Ngữ
          </button>
          <button
            onClick={() => setMode('original')}
            className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
              mode === 'original' ? buttonActive : buttonInactive
            }`}
          >
            Nguyên Tác
          </button>
        </div>

        {/* Theme & Font Controls */}
        <div className="flex items-center gap-3">
          {/* Themes */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTheme('amoled')}
              className={`px-2 py-1 rounded-md font-semibold transition cursor-pointer ${
                theme === 'amoled' ? 'bg-zinc-800 text-white border border-zinc-600' : 'bg-zinc-900 text-gray-400'
              }`}
            >
              AMOLED
            </button>
            <button
              onClick={() => setTheme('sepia')}
              className={`px-2 py-1 rounded-md font-semibold transition cursor-pointer ${
                theme === 'sepia' ? 'bg-[#8c5e32] text-white' : 'bg-[#e5d4b5] text-[#3d2e1e]'
              }`}
            >
              Sepia
            </button>
            <button
              onClick={() => setTheme('light')}
              className={`px-2 py-1 rounded-md font-semibold transition cursor-pointer ${
                theme === 'light' ? 'bg-white text-black border border-gray-400' : 'bg-gray-300 text-gray-800'
              }`}
            >
              Sáng
            </button>
          </div>

          {/* Font sizing */}
          <div className="flex items-center gap-1 border-l pl-3 border-gray-700/50">
            <button
              onClick={() => setFontSize((prev) => Math.max(12, prev - 1))}
              className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${buttonInactive}`}
            >
              A-
            </button>
            <span className="font-mono text-xs font-semibold px-1">{fontSize}px</span>
            <button
              onClick={() => setFontSize((prev) => Math.min(32, prev + 1))}
              className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${buttonInactive}`}
            >
              A+
            </button>
          </div>
        </div>
      </div>

      {/* Audit warning banner if issues exist */}
      {auditInfo && auditInfo.issues.length > 0 && (
        <div className="bg-amber-950/40 border-b border-amber-900/60 px-4 py-1.5 text-xs text-amber-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 truncate">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">Kiểm định: {auditInfo.issues.join(' | ')}</span>
          </div>
        </div>
      )}

      {/* 3. Main Reader Content Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-12 md:px-24 py-8">
        <div
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
          className="max-w-4xl mx-auto whitespace-pre-wrap font-sans select-text tracking-normal"
        >
          {getDisplayText()}
        </div>
      </div>

      {/* 4. Reader Bottom Navigation Bar */}
      <div className={`px-4 py-3 border-t flex items-center justify-between ${barBg}`}>
        <button
          onClick={() => onNavigateChapter(chapterIndex - 1)}
          disabled={chapterIndex <= 0}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-30 ${buttonInactive}`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Chương Trước</span>
        </button>

        <span className="font-mono text-xs font-bold opacity-80">
          {chapterIndex + 1} / {total}
        </span>

        <button
          onClick={() => onNavigateChapter(chapterIndex + 1)}
          disabled={chapterIndex >= total - 1}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-30 ${buttonInactive}`}
        >
          <span>Chương Sau</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
