import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  Square,
  Upload,
  BookOpen,
  Plus,
  Scissors,
  Download,
  Terminal,
  Trash2,
  Edit2,
  FolderPlus,
  Layers,
  FastForward,
  Activity,
} from 'lucide-react';
import { AppSettings, LogMessage, ProjectData } from '../types';
import { parseEbookFile, splitTextIntoChapters } from '../utils/fileParser';

interface TabTranslateProps {
  settings: AppSettings;
  projectData: ProjectData;
  logs: LogMessage[];
  isTranslating: boolean;
  isPaused: boolean;
  currentTranslatingIndex: number;
  onUpdateProjectData: (data: Partial<ProjectData>) => void;
  onStartRangeTranslation: (fromChap: number, toChap: number) => void;
  onTogglePause: () => void;
  onCancelTranslation: () => void;
  onOpenProjectModal: () => void;
  onOpenNewProjectModal: () => void;
  onOpenFullGlossary: () => void;
  onOpenEditGlossaryModal: (raw: string, vi: string) => void;
  onAddLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error' | 'ai') => void;
}

export const TabTranslate: React.FC<TabTranslateProps> = ({
  settings: _settings,
  projectData,
  logs,
  isTranslating,
  isPaused,
  currentTranslatingIndex,
  onUpdateProjectData,
  onStartRangeTranslation,
  onTogglePause,
  onCancelTranslation,
  onOpenProjectModal,
  onOpenNewProjectModal,
  onOpenFullGlossary,
  onOpenEditGlossaryModal,
  onAddLog,
}) => {
  const totalRaw = projectData.rawChapters.length;
  const totalTranslated = Object.keys(projectData.translatedChapters).length;
  const glossaryEntries = Object.entries(projectData.masterGlossary);

  // Tính toán chương tiếp theo chưa dịch
  const nextUntranslatedChap = useMemo(() => {
    if (totalRaw === 0) return 1;
    const transKeys = Object.keys(projectData.translatedChapters).map(Number);
    if (transKeys.length === 0) return 1;
    const maxTrans = Math.max(...transKeys);
    const next = maxTrans + 2; // (0-indexed -> 1-indexed next)
    return next <= totalRaw ? next : totalRaw;
  }, [projectData.translatedChapters, totalRaw]);

  const [fromChapInput, setFromChapInput] = useState<string>(String(nextUntranslatedChap));
  const [toChapInput, setToChapInput] = useState<string>(String(totalRaw || 1));
  const [rawTextInput, setRawTextInput] = useState<string>('');
  const [chunkSizeInput, setChunkSizeInput] = useState<string>('3500');
  const [newGlossaryKey, setNewGlossaryKey] = useState<string>('');
  const [newGlossaryVal, setNewGlossaryVal] = useState<string>('');
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const glossaryFileInputRef = useRef<HTMLInputElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Tự động load chương kế tiếp khi chuyển dự án hoặc khi load lại app
  useEffect(() => {
    if (!isTranslating) {
      setFromChapInput(String(nextUntranslatedChap));
      if (totalRaw > 0) {
        setToChapInput(String(totalRaw));
      }
    }
  }, [projectData.projectName, totalRaw, nextUntranslatedChap, isTranslating]);

  // Auto-scroll logs
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = 0;
    }
  }, [logs]);

  const handleStart = (customFrom?: number, customTo?: number) => {
    let from = customFrom !== undefined ? customFrom : (parseInt(fromChapInput.trim(), 10) || 1);
    let to = customTo !== undefined ? customTo : (parseInt(toChapInput.trim(), 10) || totalRaw);

    from = Math.max(1, Math.min(from, totalRaw));
    to = Math.max(from, Math.min(to, totalRaw));

    onStartRangeTranslation(from, to);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoadingFile(true);
    onAddLog(`⏳ Đang nạp và giải mã tệp Ebook (${file.name})...`, 'info');

    try {
      const result = await parseEbookFile(file);
      const text = result.text;
      setRawTextInput(text);

      const chapters = splitTextIntoChapters(text, false);
      onUpdateProjectData({
        loadedRawContent: text,
        rawChapters: chapters,
      });

      setFromChapInput('1');
      setToChapInput(String(chapters.length));
      onAddLog(`📚 Đã nạp thành công [${file.name}] và tách ${chapters.length} chương!`, 'success');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      onAddLog(`❌ Lỗi đọc tệp Ebook: ${errorMsg}`, 'error');
    } finally {
      setIsLoadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSplitChapters = (byChars: boolean) => {
    const textToSplit = rawTextInput || projectData.loadedRawContent;
    if (!textToSplit.trim()) {
      onAddLog('⚠️ Vui lòng dán văn bản truyện hoặc tải tệp .txt/.epub lên trước!', 'warning');
      return;
    }

    const chunkSize = parseInt(chunkSizeInput.trim(), 10) || 3500;
    const chapters = splitTextIntoChapters(textToSplit, byChars, chunkSize);

    onUpdateProjectData({
      loadedRawContent: textToSplit,
      rawChapters: chapters,
    });

    setFromChapInput('1');
    setToChapInput(String(chapters.length));
    onAddLog(
      `✂️ Đã tách thành ${chapters.length} chương (${byChars ? `Mỗi đoạn ~${chunkSize} ký tự` : 'Theo tác giả Regex'})`,
      'success'
    );
  };

  const handleAddGlossaryTerm = () => {
    const k = newGlossaryKey.trim();
    const v = newGlossaryVal.trim();
    if (!k || !v) return;

    const updated = {
      ...projectData.masterGlossary,
      [k]: v,
    };

    onUpdateProjectData({ masterGlossary: updated });
    setNewGlossaryKey('');
    setNewGlossaryVal('');
    onAddLog(`➕ Đã thêm thuật ngữ vào Glossary: [${k} ➔ ${v}]`, 'success');
  };

  const handleDeleteGlossaryTerm = (keyToDelete: string) => {
    const updated = { ...projectData.masterGlossary };
    delete updated[keyToDelete];
    onUpdateProjectData({ masterGlossary: updated });
    onAddLog(`🗑️ Đã xóa thuật ngữ: [${keyToDelete}]`, 'info');
  };

  const handleExportGlossary = () => {
    if (glossaryEntries.length === 0) {
      onAddLog('⚠️ Kho từ điển đang trống!', 'warning');
      return;
    }

    const header = `# Master Glossary - ${projectData.projectName}\n# Định dạng: tên raw=tên tiếng việt\n\n`;
    const content = glossaryEntries.map(([k, v]) => `${k}=${v}`).join('\n');
    const fullText = header + content;

    navigator.clipboard.writeText(fullText);
    onAddLog(`📋 Đã sao chép ${glossaryEntries.length} thuật ngữ dạng raw=vi vào Clipboard!`, 'success');
  };

  const handleImportGlossaryFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n');
      const updated = { ...projectData.masterGlossary };
      let count = 0;

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;

        let raw = '';
        let vi = '';
        if (trimmed.includes('=')) {
          const parts = trimmed.split('=', 2);
          raw = parts[0].trim();
          vi = parts[1].trim();
        } else if (trimmed.includes('➔')) {
          const parts = trimmed.split('➔', 2);
          raw = parts[0].trim();
          vi = parts[1].trim();
        } else if (trimmed.includes('->')) {
          const parts = trimmed.split('->', 2);
          raw = parts[0].trim();
          vi = parts[1].trim();
        } else if (trimmed.includes(':')) {
          const parts = trimmed.split(':', 2);
          raw = parts[0].trim();
          vi = parts[1].trim();
        } else if (trimmed.includes('\t')) {
          const parts = trimmed.split('\t', 2);
          raw = parts[0].trim();
          vi = parts[1].trim();
        }

        if (raw && vi) {
          updated[raw] = vi;
          count++;
        }
      }

      onUpdateProjectData({ masterGlossary: updated });
      onAddLog(`📚 Đã nạp thành công ${count} thuật ngữ vào Master Glossary của dự án [${projectData.projectName}]!`, 'success');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      onAddLog(`❌ Lỗi nạp Glossary: ${errorMsg}`, 'error');
    } finally {
      if (glossaryFileInputRef.current) glossaryFileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-5 pb-16">
      {/* 1. Project Header Card */}
      <section className="bg-[#141414] border border-[#222] rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Dự án: <span className="text-blue-400 font-mono underline">{projectData.projectName}</span>
              </h2>
              <p className="text-[11px] text-gray-400">Dữ liệu chương, bản dịch và từ điển được lưu độc lập từng truyện</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenProjectModal}
              className="px-3 py-1.5 bg-[#1e293b] hover:bg-[#283548] text-gray-200 text-xs font-semibold rounded-lg border border-[#334155] transition cursor-pointer flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Đổi Truyện</span>
            </button>
            <button
              onClick={onOpenNewProjectModal}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>+ Dự Án Mới</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. BẢNG ĐIỀU KHIỂN DỊCH CHÍNH (Bắt đầu / Tạm dừng / Hủy) */}
      <section className="bg-[#141414] border border-[#222] rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Header tiến độ */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className="text-blue-400 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              Tiến độ: {totalTranslated} / {totalRaw} chương đã dịch
            </span>
            <span className="text-gray-300 font-mono bg-[#21262d] px-2 py-0.5 rounded border border-[#30363d]">
              {totalRaw > 0 ? Math.round((totalTranslated / totalRaw) * 100) : 0}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[#1e1e1e] h-2.5 rounded-full overflow-hidden border border-[#333]">
            <div
              className="bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 h-full transition-all duration-300 rounded-full"
              style={{ width: `${totalRaw > 0 ? (totalTranslated / totalRaw) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Cấu hình Khoảng Chương (Range) */}
        <div className="p-3.5 rounded-xl bg-[#161b22] border border-[#30363d] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-gray-200 uppercase tracking-wider">
              Chọn khoảng chương dịch:
            </span>
            {totalRaw > 0 && nextUntranslatedChap <= totalRaw && (
              <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                Chương kế tiếp chưa dịch: <b>Chương {nextUntranslatedChap}</b>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2">
              <span className="text-xs text-gray-400 whitespace-nowrap">Từ chương:</span>
              <input
                type="number"
                min="1"
                max={totalRaw || 1}
                value={fromChapInput}
                onChange={(e) => setFromChapInput(e.target.value)}
                disabled={isTranslating}
                className="w-full bg-transparent text-xs text-white text-center font-bold font-mono focus:outline-none"
              />
            </div>

            <span className="text-gray-500 font-bold">➔</span>

            <div className="flex-1 flex items-center gap-2 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2">
              <span className="text-xs text-gray-400 whitespace-nowrap">Đến chương:</span>
              <input
                type="number"
                min="1"
                max={totalRaw || 1}
                value={toChapInput}
                onChange={(e) => setToChapInput(e.target.value)}
                disabled={isTranslating}
                className="w-full bg-transparent text-xs text-white text-center font-bold font-mono focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* NÚT ĐIỀU KHIỂN CHÍNH: BẮT ĐẦU / TẠM DỪNG / HỦY */}
        {!isTranslating ? (
          <div className="space-y-2">
            {/* Nút chính Bắt đầu Dịch */}
            <button
              type="button"
              onClick={() => handleStart()}
              disabled={totalRaw === 0}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-[0.99]"
            >
              <Play className="w-4 h-4 fill-current text-white" />
              <span>
                {totalRaw === 0
                  ? 'Vui lòng nạp truyện ở mục bên dưới'
                  : `BẮT ĐẦU DỊCH (Chương ${fromChapInput} ➔ Chương ${toChapInput})`}
              </span>
            </button>

            {/* Nút Dịch Nhanh Từ Chương Kế Tiếp */}
            {totalRaw > 0 && nextUntranslatedChap <= totalRaw && (
              <button
                type="button"
                onClick={() => {
                  setFromChapInput(String(nextUntranslatedChap));
                  setToChapInput(String(totalRaw));
                  handleStart(nextUntranslatedChap, totalRaw);
                }}
                className="w-full py-2 px-3 bg-[#1e293b] hover:bg-[#283548] text-blue-300 border border-blue-500/30 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <FastForward className="w-3.5 h-3.5 text-blue-400" />
                <span>Dịch tiếp từ Chương {nextUntranslatedChap} đến hết (Chương {totalRaw})</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3 p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/40 animate-pulse">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-blue-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                {isPaused
                  ? `ĐANG TẠM DỪNG TẠI CHƯƠNG ${currentTranslatingIndex + 1}`
                  : `ĐANG DỊCH CHƯƠNG ${currentTranslatingIndex + 1} / ${totalRaw}...`}
              </span>
              <span className="text-[11px] text-gray-300 font-mono">
                {isPaused ? 'Tạm dừng' : 'Đang chạy ngầm'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Nút Tạm dừng / Tiếp tục */}
              <button
                type="button"
                onClick={onTogglePause}
                className={`py-3 px-4 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2 shadow-md ${
                  isPaused
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                    : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
                }`}
              >
                {isPaused ? (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>▶ TIẾP TỤC DỊCH</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>⏸ TẠM DỪNG</span>
                  </>
                )}
              </button>

              {/* Nút Hủy tiến trình */}
              <button
                type="button"
                onClick={onCancelTranslation}
                className="py-3 px-4 bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-rose-700/20"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>⏹ HỦY DỊCH</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 3. Nhật ký Terminal Live Logs */}
      <section className="bg-[#141414] border border-[#222] rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-gray-200">Nhật Ký Tiến Trình &amp; AI Streaming</h3>
          </div>
          <span className="text-[11px] text-gray-500 font-mono">{logs.length} sự kiện</span>
        </div>

        <div
          ref={logsContainerRef}
          className="h-44 bg-[#0d1117] border border-[#30363d] rounded-lg p-2.5 font-mono text-[11px] overflow-y-auto space-y-1.5"
        >
          {logs.length === 0 ? (
            <div className="text-gray-500 italic text-center py-6">Chưa có nhật ký nào phát sinh...</div>
          ) : (
            logs.map((log) => {
              let color = 'text-gray-300';
              if (log.type === 'success') color = 'text-emerald-400 font-semibold';
              if (log.type === 'error') color = 'text-rose-400 font-semibold';
              if (log.type === 'warning') color = 'text-amber-400';
              if (log.type === 'ai') color = 'text-blue-400';
              return (
                <div key={log.id} className="leading-tight break-words">
                  <span className="text-gray-500 mr-1.5">[{log.timestamp}]</span>
                  <span className={color}>{log.text}</span>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 4. Nạp Tệp Ebook & Tách Chương */}
      <section className="bg-[#141414] border border-[#222] rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs sm:text-sm font-bold text-gray-200">Nạp Truyện Gốc (Ebook / TXT / EPUB)</h3>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".txt,.epub"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoadingFile}
              className="flex-1 py-2.5 px-4 bg-[#1e293b] hover:bg-[#283548] text-blue-300 text-xs font-semibold rounded-lg border border-blue-500/30 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>{isLoadingFile ? 'Đang giải mã Ebook...' : '📂 Chọn Tệp .TXT hoặc .EPUB từ máy'}</span>
            </button>
          </div>

          <div className="relative">
            <textarea
              rows={4}
              value={rawTextInput}
              onChange={(e) => setRawTextInput(e.target.value)}
              placeholder="Hoặc dán trực tiếp toàn bộ văn bản truyện thô chữ Hán / Ngoại ngữ vào đây..."
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-xs text-gray-200 font-mono focus:outline-none focus:border-blue-500 leading-relaxed selectable-text"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleSplitChapters(false)}
              className="px-3.5 py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-200 text-xs font-semibold rounded-lg border border-[#30363d] transition cursor-pointer flex items-center gap-1.5"
            >
              <Scissors className="w-3.5 h-3.5 text-blue-400" />
              <span>Tách theo Regex tác giả (第X章/Chương X)</span>
            </button>

            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-xs text-gray-400">Độ dài đoạn:</span>
              <input
                type="number"
                value={chunkSizeInput}
                onChange={(e) => setChunkSizeInput(e.target.value)}
                className="w-16 bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-white text-center font-mono focus:outline-none"
              />
              <button
                onClick={() => handleSplitChapters(true)}
                className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-200 text-xs font-semibold rounded-lg border border-[#30363d] transition cursor-pointer"
              >
                Cắt đoạn đều
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Quản Lý Master Glossary */}
      <section className="bg-[#141414] border border-[#222] rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-gray-200 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              Từ Điển Master Glossary Của Truyện ({glossaryEntries.length} từ)
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Được tự học tự động khi dịch chương hoặc nạp danh sách tên nhân vật thủ công
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={glossaryFileInputRef}
              onChange={handleImportGlossaryFile}
              accept=".txt"
              className="hidden"
            />
            <button
              onClick={() => glossaryFileInputRef.current?.click()}
              className="px-2.5 py-1.5 bg-[#1e293b] hover:bg-[#283548] text-gray-200 text-xs font-semibold rounded-lg border border-[#334155] transition cursor-pointer flex items-center gap-1"
            >
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              <span>Nạp .txt</span>
            </button>
            <button
              onClick={handleExportGlossary}
              className="px-2.5 py-1.5 bg-[#1e293b] hover:bg-[#283548] text-gray-200 text-xs font-semibold rounded-lg border border-[#334155] transition cursor-pointer flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copy</span>
            </button>
            <button
              onClick={onOpenFullGlossary}
              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              Xem tất cả
            </button>
          </div>
        </div>

        {/* Thêm từ mới thủ công */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Tên gốc Hán (vd: 林辰)"
            value={newGlossaryKey}
            onChange={(e) => setNewGlossaryKey(e.target.value)}
            className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
          />
          <span className="text-gray-500 font-bold">➔</span>
          <input
            type="text"
            placeholder="Nghĩa dịch (vd: Lâm Thần)"
            value={newGlossaryVal}
            onChange={(e) => setNewGlossaryVal(e.target.value)}
            className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleAddGlossaryTerm}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm</span>
          </button>
        </div>

        {/* Danh sách xem nhanh 6 từ mới nhất */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {glossaryEntries.slice(-6).map(([k, v]) => (
            <div
              key={k}
              className="flex items-center justify-between p-2 rounded-lg bg-[#161b22] border border-[#21262d] text-xs"
            >
              <div className="truncate">
                <span className="font-semibold text-gray-200">{k}</span>
                <span className="text-gray-500 mx-1.5">➔</span>
                <span className="text-emerald-400 font-bold">{v}</span>
              </div>
              <div className="flex items-center gap-1 ml-2 shrink-0">
                <button
                  onClick={() => onOpenEditGlossaryModal(k, v)}
                  className="p-1 text-gray-400 hover:text-blue-400 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteGlossaryTerm(k)}
                  className="p-1 text-gray-400 hover:text-rose-400 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
