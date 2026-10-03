import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  Upload,
  BookOpen,
  Plus,
  Scissors,
  Download,
  BookMarked,
  Terminal,
  Trash2,
  Edit2,
  FolderPlus,
  Layers,
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
  const [fromChapInput, setFromChapInput] = useState<string>('1');
  const [toChapInput, setToChapInput] = useState<string>('1');
  const [rawTextInput, setRawTextInput] = useState<string>('');
  const [chunkSizeInput, setChunkSizeInput] = useState<string>('3500');
  const [newGlossaryKey, setNewGlossaryKey] = useState<string>('');
  const [newGlossaryVal, setNewGlossaryVal] = useState<string>('');
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const glossaryFileInputRef = useRef<HTMLInputElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  const totalRaw = projectData.rawChapters.length;
  const totalTranslated = Object.keys(projectData.translatedChapters).length;
  const glossaryEntries = Object.entries(projectData.masterGlossary);

  // Sync range inputs when chapters change
  useEffect(() => {
    if (totalRaw > 0) {
      setToChapInput(String(totalRaw));
    }
  }, [totalRaw]);

  // Auto-scroll logs to top or bottom
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = 0;
    }
  }, [logs]);

  const handleStart = () => {
    let from = parseInt(fromChapInput.trim(), 10) || 1;
    let to = parseInt(toChapInput.trim(), 10) || totalRaw;

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
      alert('Vui lòng dán văn bản truyện hoặc tải tệp .txt/.epub lên trước!');
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
      alert('Kho từ điển đang trống!');
      return;
    }

    const header = `# Master Glossary - ${projectData.projectName}\n# Định dạng: tên raw=tên tiếng việt\n\n`;
    const content = glossaryEntries.map(([k, v]) => `${k}=${v}`).join('\n');
    const fullText = header + content;

    navigator.clipboard.writeText(fullText);
    onAddLog(`📋 Đã sao chép ${glossaryEntries.length} thuật ngữ dạng raw=vi vào Clipboard!`, 'success');
    alert(`Đã sao chép ${glossaryEntries.length} từ vào Clipboard! Bạn có thể dán vào tệp .txt.`);
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
    <div className="space-y-6 pb-12">
      {/* 1. Project Header Card */}
      <section className="bg-[#141414] border border-[#222] rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Dự án: <span className="text-blue-400 underline">{projectData.projectName}</span>
              </h2>
              <p className="text-[11px] text-gray-400">Dữ liệu chương, bản dịch và từ điển được lưu độc lập từng truyện</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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

      {/* 2. Thẻ Tiến độ & Dịch theo Range */}
      <section className="bg-[#141414] border border-[#222] rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        <div>
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className="text-blue-400">
              Tiến độ: {totalTranslated} / {totalRaw} chương
            </span>
            <span className="text-gray-400 font-mono">
              {totalRaw > 0 ? Math.round((totalTranslated / totalRaw) * 100) : 0}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[#1e1e1e] h-2.5 rounded-full overflow-hidden border border-[#333]">
            <div
              className="bg-gradient-to-r from-blue-600 to-emerald-500 h-full transition-all duration-300 rounded-full"
              style={{ width: `${totalRaw > 0 ? (totalTranslated / totalRaw) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Range Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-gray-300 whitespace-nowrap">Từ chương:</span>
            <input
              type="number"
              min="1"
              max={totalRaw || 1}
              value={fromChapInput}
              onChange={(e) => setFromChapInput(e.target.value)}
              disabled={isTranslating}
              className="w-20 bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-white text-center font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-gray-300 whitespace-nowrap">Đến chương:</span>
            <input
              type="number"
              min="1"
              max={totalRaw || 1}
              value={toChapInput}
              onChange={(e) => setToChapInput(e.target.value)}
              disabled={isTranslating}
              className="w-20 bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-white text-center font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Action Buttons: Dịch / Tạm dừng / Hủy */}
          <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
            {!isTranslating ? (
              <button
                onClick={handleStart}
                disabled={totalRaw === 0}
                className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Dịch Range</span>
              </button>
            ) : (
              <>
                <button
                  onClick={onTogglePause}
                  className="flex-1 sm:flex-none px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isPaused ? (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Tiếp tục</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Tạm dừng</span>
                    </>
                  )}
                </button>

                <button
                  onClick={onCancelTranslation}
                  className="flex-1 sm:flex-none px-3.5 py-2 bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Hủy</span>
                </button>
              </>
            )}
          </div>
        </div>

        {isTranslating && (
          <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-800/40 text-xs text-blue-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            <span>
              {isPaused ? '⏸ Đang tạm dừng...' : `⚡ Đang xử lý Chương ${currentTranslatingIndex + 1} / ${totalRaw}...`}
            </span>
          </div>
        )}
      </section>

      {/* 3. Nạp văn bản truyện thô & Tách chương */}
      <section className="bg-[#141414] border border-[#222] rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-white">Nạp văn bản truyện thô:</h2>
          <span className="text-xs text-gray-400 font-mono">
            {totalRaw} chương ({rawTextInput.length || projectData.loadedRawContent.length} ký tự)
          </span>
        </div>

        <textarea
          rows={3}
          placeholder="Dán nội dung truyện thô vào đây hoặc bấm 'Chọn File' bên dưới..."
          value={rawTextInput || (projectData.loadedRawContent ? projectData.loadedRawContent.slice(0, 500) + '...' : '')}
          onChange={(e) => setRawTextInput(e.target.value)}
          className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
        />

        {/* File Picker row */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".txt,.epub,.md,text/plain,application/epub+zip"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoadingFile}
            className="px-3 py-2 bg-[#1e293b] hover:bg-[#283548] text-gray-200 text-xs font-semibold rounded-lg border border-[#334155] transition cursor-pointer flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span>{isLoadingFile ? 'Đang đọc...' : '📂 Chọn File .txt / .epub'}</span>
          </button>

          <button
            onClick={() => handleSplitChapters(false)}
            className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Tách Tác Giả (Regex)</span>
          </button>

          <div className="flex items-center gap-1.5 ml-auto">
            <input
              type="number"
              value={chunkSizeInput}
              onChange={(e) => setChunkSizeInput(e.target.value)}
              placeholder="3500"
              className="w-16 bg-[#0d1117] border border-[#30363d] rounded-lg px-2 py-1.5 text-xs text-white text-center font-mono focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => handleSplitChapters(true)}
              className="px-3 py-2 bg-sky-700 hover:bg-sky-600 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              Tách Theo Ký Tự
            </button>
          </div>
        </div>
      </section>

      {/* 4. Master Glossary */}
      <section className="bg-[#141414] border border-[#222] rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm sm:text-base font-bold text-white">
              Từ Điển Master Glossary ({glossaryEntries.length} từ)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={glossaryFileInputRef}
              onChange={handleImportGlossaryFile}
              accept=".txt,text/plain"
              className="hidden"
            />
            <button
              onClick={() => glossaryFileInputRef.current?.click()}
              className="px-2.5 py-1.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1"
            >
              <Upload className="w-3 h-3" />
              <span>Nạp .txt</span>
            </button>
            <button
              onClick={handleExportGlossary}
              className="px-2.5 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-300 text-xs font-semibold rounded-lg border border-[#30363d] transition cursor-pointer flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              <span>Xuất</span>
            </button>
          </div>
        </div>

        {/* Add Entry inputs */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Từ gốc (VD: 林辰)"
            value={newGlossaryKey}
            onChange={(e) => setNewGlossaryKey(e.target.value)}
            className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
          />
          <input
            type="text"
            placeholder="Nghĩa dịch (VD: Lâm Thần)"
            value={newGlossaryVal}
            onChange={(e) => setNewGlossaryVal(e.target.value)}
            className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={handleAddGlossaryTerm}
            disabled={!newGlossaryKey.trim() || !newGlossaryVal.trim()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Từ</span>
          </button>
        </div>

        {/* Recent Glossary Items Preview (Top 6) */}
        <div className="space-y-1.5">
          {glossaryEntries.length === 0 ? (
            <p className="text-xs text-gray-500 py-2">
              Chưa có từ điển. Sau khi dịch mỗi chương, AI sẽ tự động học và thêm từ mới vào đây.
            </p>
          ) : (
            glossaryEntries.slice(-6).reverse().map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between p-2 rounded-lg bg-[#161b22] border border-[#30363d] text-xs"
              >
                <span className="text-emerald-400 font-medium">
                  {k} <span className="text-gray-400">➔</span> {v}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onOpenEditGlossaryModal(k, v)}
                    className="px-2 py-0.5 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded text-[11px] transition"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteGlossaryTerm(k)}
                    className="px-2 py-0.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded text-[11px] transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Open Full Modal */}
        {glossaryEntries.length > 0 && (
          <button
            onClick={onOpenFullGlossary}
            className="w-full py-2 bg-[#1b222c] hover:bg-[#253040] text-blue-300 text-xs font-semibold rounded-lg border border-blue-900/50 transition cursor-pointer"
          >
            📖 Mở Kho Từ Điển Đầy Đủ ({glossaryEntries.length} từ) ▾
          </button>
        )}
      </section>

      {/* 5. Live Console Logs */}
      <section className="bg-[#141414] border border-[#222] rounded-xl p-4 sm:p-5 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs sm:text-sm font-bold text-gray-300">Live Console Logs:</h2>
          </div>
          <span className="text-[11px] text-gray-500 font-mono">Tự động cập nhật thời gian thực</span>
        </div>

        <div
          ref={logsContainerRef}
          className="bg-[#050505] border border-[#1f242c] rounded-lg p-3 font-mono text-xs max-h-48 overflow-y-auto space-y-1"
        >
          {logs.length === 0 ? (
            <p className="text-emerald-500">🚀 DroidTranslator Native Sẵn Sàng!</p>
          ) : (
            logs.map((log) => {
              let color = 'text-emerald-400';
              if (log.type === 'error') color = 'text-rose-400';
              if (log.type === 'warning') color = 'text-amber-400';
              if (log.type === 'info') color = 'text-gray-300';
              if (log.type === 'ai') color = 'text-blue-400';

              return (
                <div key={log.id} className={`${color} leading-relaxed`}>
                  <span className="text-gray-500 select-none">[{log.timestamp}]</span> {log.text}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};
