import React, { useState } from 'react';
import {
  Trash2,
  Layers,
  FolderPlus,
  ShieldCheck,
  Languages,
  Filter,
  Download,
  SearchCheck,
  Wrench,
  RotateCcw,
} from 'lucide-react';
import { AppSettings, ProjectData } from '../types';
import { RootSettingsSection } from './RootSettingsSection';

interface TabSettingsProps {
  settings: AppSettings;
  projectData: ProjectData;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onOpenProjectModal: () => void;
  onOpenNewProjectModal: () => void;
  onDeleteCurrentProject: () => void;
  onExportFullNovel: () => void;
  onDownloadSourceCode?: () => void;
  onAddLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error' | 'ai') => void;
}

const LANGUAGES = [
  { id: 'Tiếng Việt', label: 'Tiếng Việt', note: 'Chống chữ Hán nghiêm ngặt' },
  { id: '日本語', label: '日本語', note: 'Thả lỏng Kanji, Hiragana' },
  { id: 'English', label: 'English', note: 'Standard English' },
  { id: '한국어', label: '한국어', note: 'Hangul translation' },
];

export const TabSettings: React.FC<TabSettingsProps> = ({
  settings,
  projectData,
  onUpdateSettings,
  onOpenProjectModal,
  onOpenNewProjectModal,
  onDeleteCurrentProject,
  onExportFullNovel,
  onDownloadSourceCode,
  onAddLog,
}) => {
  const [customMinTermInput, setCustomMinTermInput] = useState<string>(String(settings.minTermLength));
  const [customMinFreqInput, setCustomMinFreqInput] = useState<string>(String(settings.minFrequency));
  const [delayInput, setDelayInput] = useState<string>(String(settings.delaySec));

  const handleSaveMinTerm = () => {
    const val = parseInt(customMinTermInput.trim(), 10);
    if (val && val >= 1) {
      onUpdateSettings({ minTermLength: val });
      onAddLog(`⚙️ Đã lưu Độ dài Glossary tối thiểu: >= ${val} ký tự`, 'success');
      alert(`Đã lưu độ dài chữ Hán tối thiểu: ${val} ký tự!`);
    }
  };

  const handleSaveMinFreq = () => {
    const val = parseInt(customMinFreqInput.trim(), 10);
    if (val && val >= 1) {
      onUpdateSettings({ minFrequency: val });
      onAddLog(`⚙️ Đã lưu Tần suất Glossary tối thiểu: >= ${val} lần`, 'success');
      alert(`Đã lưu tần suất lặp lại tối thiểu: ${val} lần!`);
    }
  };

  const handleSaveDelay = () => {
    const val = parseInt(delayInput.trim(), 10);
    if (val && val >= 1) {
      onUpdateSettings({ delaySec: val });
      onAddLog(`⚙️ Đã lưu độ trễ giữa các chương: ${val} giây`, 'success');
      alert(`Đã lưu độ trễ: ${val} giây!`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Quản Lý Dự Án Hiện Tại */}
      <section className="bg-[#141414] border border-[#222] rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-400" />
          <h2 className="text-sm sm:text-base font-bold text-white">1. Quản Lý Dự Án Hiện Tại</h2>
        </div>

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-blue-300">📖 Dự án: {projectData.projectName}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Đã dịch: {Object.keys(projectData.translatedChapters).length} / {projectData.rawChapters.length} chương · Glossary: {Object.keys(projectData.masterGlossary).length} từ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenProjectModal}
              className="px-3.5 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-200 text-xs font-semibold rounded-lg border border-[#30363d] transition cursor-pointer flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Chuyển Dự Án</span>
            </button>
            <button
              onClick={onOpenNewProjectModal}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>+ Tạo Mới</span>
            </button>
          </div>

          {/* Nút Xóa Dự Án Màu Đỏ An Toàn */}
          <div className="pt-2 border-t border-[#30363d]">
            <button
              onClick={onDeleteCurrentProject}
              className="w-full py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-bold rounded-lg border border-rose-900/50 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>🗑️ Xóa Vĩnh Viễn Dự Án Này</span>
            </button>
            <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
              💡 Khi xóa dự án, chỉ dữ liệu của truyện này bị xóa. Toàn bộ kho Key API và Thẻ Prompt ở Tab 1 được BẢO TOÀN VĨNH CỬU 100%.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Tinh Chỉnh Thuật Ngữ Glossary (AI Auto-Learning) */}
      <section className="bg-[#141414] border border-[#222] rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm sm:text-base font-bold text-white">2. Tinh Chỉnh Thuật Ngữ Glossary (AI Auto-Learning)</h2>
        </div>

        {/* Độ dài chữ Hán tối thiểu */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-300">
            • Độ dài chữ Hán tối thiểu: <span className="text-emerald-400 font-bold">{settings.minTermLength} ký tự</span>
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((len) => (
              <button
                key={len}
                onClick={() => {
                  onUpdateSettings({ minTermLength: len });
                  setCustomMinTermInput(String(len));
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                  settings.minTermLength === len
                    ? 'bg-emerald-600 border-emerald-400 text-white'
                    : 'bg-[#1b1f27] border-[#2d3748] text-gray-300 hover:bg-[#252c38]'
                }`}
              >
                {len} kt
              </button>
            ))}

            <div className="flex items-center gap-1 ml-auto">
              <input
                type="number"
                min="1"
                value={customMinTermInput}
                onChange={(e) => setCustomMinTermInput(e.target.value)}
                className="w-16 bg-[#0d1117] border border-[#30363d] rounded-lg px-2 py-1 text-xs text-white text-center font-mono focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleSaveMinTerm}
                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>

        {/* Tần suất xuất hiện tối thiểu */}
        <div className="space-y-2 pt-2 border-t border-[#222]">
          <label className="text-xs font-medium text-gray-300">
            • Tần suất lặp lại tối thiểu trong chương: <span className="text-emerald-400 font-bold">≥ {settings.minFrequency} lần</span>
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((freq) => (
              <button
                key={freq}
                onClick={() => {
                  onUpdateSettings({ minFrequency: freq });
                  setCustomMinFreqInput(String(freq));
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                  settings.minFrequency === freq
                    ? 'bg-emerald-600 border-emerald-400 text-white'
                    : 'bg-[#1b1f27] border-[#2d3748] text-gray-300 hover:bg-[#252c38]'
                }`}
              >
                ≥ {freq} lần
              </button>
            ))}

            <div className="flex items-center gap-1 ml-auto">
              <input
                type="number"
                min="1"
                value={customMinFreqInput}
                onChange={(e) => setCustomMinFreqInput(e.target.value)}
                className="w-16 bg-[#0d1117] border border-[#30363d] rounded-lg px-2 py-1 text-xs text-white text-center font-mono focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleSaveMinFreq}
                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>

        {/* Chính sách xung đột */}
        <div className="pt-2 border-t border-[#222]">
          <button
            onClick={() =>
              onUpdateSettings({
                conflictPolicy: settings.conflictPolicy === 'keep-old' ? 'overwrite' : 'keep-old',
              })
            }
            className="w-full py-2 bg-[#1e293b] hover:bg-[#283548] text-gray-200 text-xs font-semibold rounded-lg border border-[#334155] transition cursor-pointer flex items-center justify-center gap-2"
          >
            <span>
              Xung Đột Nghĩa:{' '}
              {settings.conflictPolicy === 'keep-old'
                ? 'Giữ Cũ - Bỏ Mới (Bảo toàn từ điển)'
                : 'Ghi Đè Bằng Nghĩa Mới'}
            </span>
          </button>
        </div>
      </section>

      {/* 3. Dịch Thuật & Chống Lọt Chữ Hán (2 Lớp) */}
      <section className="bg-[#141414] border border-[#222] rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Languages className="w-5 h-5 text-blue-400" />
          <h2 className="text-sm sm:text-base font-bold text-white">3. Dịch Thuật &amp; Chống Lọt Chữ Hán (2 Lớp)</h2>
        </div>

        {/* Target language */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-300">
            • Ngôn ngữ đích: <span className="text-blue-400 font-bold">{settings.targetLanguage}</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.id}
                onClick={() => onUpdateSettings({ targetLanguage: l.id })}
                className={`p-2.5 rounded-lg text-left transition border cursor-pointer ${
                  settings.targetLanguage === l.id
                    ? 'bg-blue-600 border-blue-400 text-white shadow'
                    : 'bg-[#1b1f27] border-[#2d3748] text-gray-300 hover:bg-[#252c38]'
                }`}
              >
                <div className="text-xs font-bold">{l.label}</div>
                <div className="text-[10px] opacity-75 truncate">{l.note}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Anti-Hanzi Toggle */}
        <div className="pt-2 border-t border-[#222]">
          <button
            onClick={() => onUpdateSettings({ antiHanziStrict: !settings.antiHanziStrict })}
            className={`w-full py-2.5 rounded-lg text-xs font-bold transition border cursor-pointer flex items-center justify-center gap-2 ${
              settings.antiHanziStrict
                ? 'bg-emerald-700 border-emerald-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-400'
            }`}
          >
            <span>Bộ Lọc 2 Lớp Chống Chữ Hán: {settings.antiHanziStrict ? 'BẬT [Lớp 1 + Lớp 2]' : 'TẮT'}</span>
          </button>
          <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
            Lớp 1: Ép buộc Gemini dịch 100% âm Hán Việt. Lớp 2: Quét regex sau khi dịch để thế tự động các từ trong Glossary.
          </p>
        </div>
      </section>

      {/* 4. Cơ Chế Kiểm Định Chất Lượng & Sửa Lỗi Tự Động (Offline Audit & Auto-Healer) */}
      <section className="bg-[#141414] border border-[#222] rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <SearchCheck className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm sm:text-base font-bold text-white">
            4. Cơ Chế Kiểm Định Chất Lượng &amp; Sửa Lỗi Tự Động
          </h2>
        </div>

        <div className="space-y-3">
          {/* Toggle Auto Heal Offline */}
          <div className="p-3.5 rounded-xl bg-[#161b22] border border-[#30363d] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-teal-400" />
                Tự động sửa lỗi nhẹ Offline (0% Token)
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                Tự động gọt bỏ câu chào AI, dỡ thẻ markdown codeblock, thế bù chữ Hán bằng Glossary, sửa phím telex và nén dòng trắng.
              </p>
            </div>
            <button
              onClick={() => onUpdateSettings({ autoHealOffline: !settings.autoHealOffline })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                settings.autoHealOffline
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-800 text-gray-400 border border-gray-700'
              }`}
            >
              {settings.autoHealOffline ? 'BẬT' : 'TẮT'}
            </button>
          </div>

          {/* Toggle Auto Retry Critical */}
          <div className="p-3.5 rounded-xl bg-[#161b22] border border-[#30363d] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-blue-400" />
                Tự động gọi Gemini dịch lại khi phát hiện lỗi nặng
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                Khi bản dịch bị trống, tỷ lệ quá ngắn, lọt quá 25 chữ Hán, AI từ chối dịch hoặc kẹt vòng lặp: Tự động đổi Key và dịch lại để ghi đè.
              </p>
            </div>
            <button
              onClick={() => onUpdateSettings({ autoRetryCritical: !settings.autoRetryCritical })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                settings.autoRetryCritical
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 border border-gray-700'
              }`}
            >
              {settings.autoRetryCritical ? 'BẬT' : 'TẮT'}
            </button>
          </div>

          {/* Max Retry Attempts */}
          {settings.autoRetryCritical && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs">
              <span className="text-gray-300">Số lần thử lại tối đa cho mỗi chương lỗi:</span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3].map((num) => (
                  <button
                    key={num}
                    onClick={() => onUpdateSettings({ maxRetryAttempts: num })}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer border ${
                      settings.maxRetryAttempts === num
                        ? 'bg-blue-600 border-blue-400 text-white'
                        : 'bg-[#1b1f27] border-[#2d3748] text-gray-300'
                    }`}
                  >
                    {num} lần
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 5. Trạng Thái 5 Tầng Chạy Ngầm & Chế Độ Root */}
      <section className="bg-[#141414] border border-[#222] rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-400" />
          <h2 className="text-sm sm:text-base font-bold text-white">5. Trạng Thái Chạy Ngầm Bất Tử &amp; Quyền Root</h2>
        </div>

        {/* Mục Root & Linux Kernel ẩn gọn gàng */}
        <RootSettingsSection onAddLog={onAddLog} />

        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between text-emerald-400">
            <span>• 1. Background Execution Engine</span>
            <span className="font-bold bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">KÍCH HOẠT</span>
          </div>
          <div className="flex items-center justify-between text-emerald-400">
            <span>• 2. Persistent Storage (Multi-Project)</span>
            <span className="font-bold bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">KÍCH HOẠT</span>
          </div>
          <div className="flex items-center justify-between text-emerald-400">
            <span>• 3. Rate-Limit 429 Intelligent Backoff</span>
            <span className="font-bold bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">KÍCH HOẠT</span>
          </div>
          <div className="flex items-center justify-between text-emerald-400">
            <span>• 4. AI Glossary Auto-Extraction Pipeline</span>
            <span className="font-bold bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">KÍCH HOẠT</span>
          </div>
          <div className="flex items-center justify-between text-emerald-400">
            <span>• 5. Offline Quality Audit &amp; Healer Engine</span>
            <span className="font-bold bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">TÍCH HỢP SẴN</span>
          </div>
        </div>

        {/* Delay Between Chapters */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#222]">
          <div>
            <label className="text-xs font-semibold text-gray-200">Độ trễ an toàn giữa các chương:</label>
            <p className="text-[11px] text-gray-400">Tránh bị Google tạm khóa IP khi dịch truyện dung lượng lớn</p>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="1"
              value={delayInput}
              onChange={(e) => setDelayInput(e.target.value)}
              className="w-16 bg-[#0d1117] border border-[#30363d] rounded-lg px-2 py-1.5 text-xs text-white text-center font-mono focus:outline-none focus:border-blue-500"
            />
            <span className="text-xs text-gray-400">giây</span>
            <button
              onClick={handleSaveDelay}
              className="px-3 py-1.5 bg-[#1e293b] hover:bg-[#283548] text-gray-200 text-xs font-semibold rounded-lg border border-[#334155] transition cursor-pointer"
            >
              Lưu
            </button>
          </div>
        </div>

        {/* Export full novel and source code actions */}
        <div className="space-y-2">
          <button
            onClick={onExportFullNovel}
            className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>📥 Xuất Toàn Văn Tác Phẩm (.txt)</span>
          </button>

          {onDownloadSourceCode && (
            <button
              onClick={onDownloadSourceCode}
              className="w-full py-2.5 bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-500/40 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>📦 Tải Xuống Toàn Bộ Mã Nguồn Web App (.ZIP)</span>
            </button>
          )}
        </div>
      </section>
    </div>
  );
};
