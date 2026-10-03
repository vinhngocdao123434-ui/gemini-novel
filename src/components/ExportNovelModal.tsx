import React, { useState } from 'react';
import {
  X,
  Download,
  FolderDown,
  Share2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  HardDrive,
} from 'lucide-react';
import { ProjectData } from '../types';
import {
  exportNovelAndroidNative,
  shareNovelFile,
} from '../utils/fileDownloader';

interface ExportNovelModalProps {
  projectData: ProjectData;
  modelName: string;
  onClose: () => void;
  onAddLog: (text: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export const ExportNovelModal: React.FC<ExportNovelModalProps> = ({
  projectData,
  modelName,
  onClose,
  onAddLog,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'info' | 'success' | 'warning' | 'error' } | null>(null);
  const [savedPath, setSavedPath] = useState<string | null>(null);

  const transKeys = Object.keys(projectData.translatedChapters)
    .map(Number)
    .sort((a, b) => a - b);

  const totalTranslated = transKeys.length;

  const buildFullNovelText = (): string => {
    const nl = '\n';
    let fullText = `=== TOÀN VĂN TÁC PHẨM: ${projectData.projectName} ===${nl}`;
    fullText += `Biên dịch bởi: DroidTranslator (Native Android Edition)${nl}`;
    fullText += `Mô hình AI: ${modelName}${nl}`;
    fullText += `Số chương hoàn tất: ${totalTranslated} / ${projectData.rawChapters.length} chương${nl}`;
    fullText += `Thời gian xuất: ${new Date().toLocaleString()}${nl}${nl}`;

    for (const idx of transKeys) {
      fullText += `============================================================${nl}`;
      fullText += projectData.translatedChapters[idx] + nl + nl;
    }
    return fullText;
  };

  const filename = `${projectData.projectName}_FULL_TRANSLATED.txt`;

  // Xử lý lưu tệp gốc Android Native
  const handleSaveToDevice = async () => {
    setLoading(true);
    setStatusMessage({ text: 'Đang ghi file vào bộ nhớ Android...', type: 'info' });

    try {
      const fullText = buildFullNovelText();
      const res = await exportNovelAndroidNative(filename, fullText);

      if (res.success) {
        setStatusMessage({ text: res.message, type: 'success' });
        setSavedPath(res.path || null);
        onAddLog(res.message, 'success');
      } else {
        setStatusMessage({ text: res.message, type: 'error' });
        onAddLog(res.message, 'error');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setStatusMessage({ text: `Lỗi: ${errorMsg}`, type: 'error' });
      onAddLog(`Lỗi xuất file: ${errorMsg}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Chia sẻ tệp qua bảng Intent Android
  const handleShareFile = async () => {
    try {
      const fullText = buildFullNovelText();
      const ok = await shareNovelFile(filename, fullText);
      if (ok) {
        onAddLog('Đã mở bảng chia sẻ tệp của Android.', 'info');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setStatusMessage({ text: `Lỗi chia sẻ: ${errorMsg}`, type: 'warning' });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-6 backdrop-blur-md animate-fade-in"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
      }}
    >
      <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#222] flex items-center justify-between bg-[#181818]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <FolderDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">Xuất File Toàn Văn</h2>
              <p className="text-xs text-gray-400 truncate max-w-[210px]">{projectData.projectName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Card Thông tin File */}
          <div className="p-3.5 rounded-xl bg-[#1a1a1a] border border-[#2d2d2d] space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-400" /> Tên tệp:
              </span>
              <span className="font-mono text-emerald-400 font-bold truncate max-w-[190px]">
                {filename}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-indigo-400" /> Tiến độ dịch:
              </span>
              <span className="font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                {totalTranslated} / {projectData.rawChapters.length} Chương
              </span>
            </div>
          </div>

          {/* Hộp Thông báo Trạng thái */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-fade-in ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
                  : 'bg-blue-950/40 border-blue-800/60 text-blue-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : statusMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <Loader2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5 animate-spin" />
              )}
              <div className="space-y-1">
                <div className="font-medium leading-relaxed">{statusMessage.text}</div>
                {savedPath && (
                  <div className="font-mono text-[11px] text-gray-300 bg-black/40 p-1.5 rounded break-all border border-gray-700/50">
                    {savedPath}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* NÚT CHÍNH: LƯU VÀO BỘ NHỚ ANDROID */}
          <button
            onClick={handleSaveToDevice}
            disabled={loading}
            className={`w-full p-4 rounded-xl text-white font-semibold text-sm flex items-center justify-between shadow-xl transition cursor-pointer select-none ${
              savedPath
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
            }`}
          >
            <div className="flex items-center gap-3 text-left">
              {loading ? (
                <Loader2 className="w-5 h-5 text-white animate-spin shrink-0" />
              ) : savedPath ? (
                <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
              ) : (
                <FolderDown className="w-5 h-5 text-white shrink-0" />
              )}
              <div>
                <div className="font-bold text-sm">
                  {loading
                    ? 'Đang Ghi Vào Máy...'
                    : savedPath
                    ? 'Đã Lưu! Bấm Để Lưu Lại'
                    : 'LƯU VÀO BỘ NHỚ ANDROID'}
                </div>
                <div className="text-[11px] text-blue-100/80 font-normal">
                  Tự động lưu vào /Documents/ & Android/data/
                </div>
              </div>
            </div>
            <Download className="w-4 h-4 text-white" />
          </button>

          {/* NÚT PHỤ: CHIA SẺ TỆP HỆ THỐNG */}
          <button
            onClick={handleShareFile}
            className="w-full p-3.5 rounded-xl bg-[#202020] hover:bg-[#282828] border border-gray-700/60 text-gray-200 font-medium text-xs flex items-center justify-between transition cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Share2 className="w-4 h-4 text-indigo-400" />
              <span>Mở bảng Chia sẻ Android (Gửi sang App đọc / Files)</span>
            </div>
            <span className="text-[10px] text-gray-400">Share Sheet</span>
          </button>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#222] flex justify-end bg-[#141414]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
