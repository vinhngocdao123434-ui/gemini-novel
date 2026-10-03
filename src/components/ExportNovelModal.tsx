import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  FolderDown,
  Info,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  FolderPlus,
  RefreshCw,
} from 'lucide-react';
import { ProjectData } from '../types';
import {
  saveDirectToDownloadFolder,
  exportNovelWithSAF,
  openAndroidStorageSettings,
} from '../utils/fileDownloader';
import { RootBridge } from '../utils/rootBridge';

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
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: 'info' | 'success' | 'warning' | 'error';
    path?: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isNative, setIsNative] = useState<boolean>(false);

  useEffect(() => {
    setIsNative(RootBridge.isNative());
  }, []);

  const transKeys = Object.keys(projectData.translatedChapters)
    .map(Number)
    .sort((a, b) => a - b);

  const totalTranslated = transKeys.length;

  const buildFullNovelText = (): string => {
    const nl = '\n';
    let fullText = `=== TOÀN VĂN TÁC PHẨM: ${projectData.projectName} ===${nl}`;
    fullText += `Biên dịch bởi: DroidTranslator Native${nl}`;
    fullText += `Mô hình: ${modelName}${nl}`;
    fullText += `Tổng số chương đã dịch: ${totalTranslated} / ${projectData.rawChapters.length} chương${nl}`;
    fullText += `Thời gian xuất: ${new Date().toLocaleString()}${nl}${nl}`;

    for (const idx of transKeys) {
      fullText += `============================================================${nl}`;
      fullText += projectData.translatedChapters[idx] + nl + nl;
    }
    return fullText;
  };

  const filename = `${projectData.projectName}_FULL_TRANSLATED.txt`;

  // 1. Lưu trực tiếp vào /storage/emulated/0/Download/ (hoặc tải trực tiếp trình duyệt)
  const handleAutoDownload = async () => {
    setIsProcessing(true);
    setStatusMessage({ text: 'Đang tiến hành ghi tệp vào bộ nhớ máy...', type: 'info' });

    try {
      const fullText = buildFullNovelText();
      const res = await saveDirectToDownloadFolder(filename, fullText);

      if (res.success) {
        setStatusMessage({
          text: `✅ ${res.message}`,
          type: 'success',
          path: res.path,
        });
        onAddLog(res.message, 'success');
      } else {
        setStatusMessage({
          text: `⚠️ ${res.message || 'Không thể ghi tệp tự động. Bạn hãy thử nút Chọn Nơi Lưu (SAF) bên dưới!'}`,
          type: 'warning',
        });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setStatusMessage({ text: `Lỗi xuất tệp: ${errorMsg}`, type: 'error' });
      onAddLog(`Lỗi xuất tệp: ${errorMsg}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Mở hộp thoại hệ thống SAF để người dùng chọn vị trí lưu tùy ý
  const handleSafExport = async () => {
    setIsProcessing(true);
    setStatusMessage({ text: 'Đang mở trình quản lý tệp hệ thống Android...', type: 'info' });

    try {
      const fullText = buildFullNovelText();
      const res = await exportNovelWithSAF(filename, fullText);

      if (res.success) {
        setStatusMessage({
          text: `✅ ${res.message}`,
          type: 'success',
          path: res.path,
        });
        onAddLog(res.message, 'success');
      } else {
        setStatusMessage({
          text: res.message || 'Bạn đã đóng hoặc hủy hộp thoại lưu tệp.',
          type: 'warning',
        });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setStatusMessage({ text: `Lỗi xuất tệp: ${errorMsg}`, type: 'error' });
      onAddLog(`Lỗi xuất tệp: ${errorMsg}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Mở Cài đặt cấp quyền bộ nhớ Android
  const handleOpenPermissions = async () => {
    try {
      await openAndroidStorageSettings();
      onAddLog('Đã mở màn hình cấp quyền Quản lý Tệp của Android.', 'info');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      onAddLog(`Không thể mở Cài đặt: ${errorMsg}`, 'error');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-6 backdrop-blur-sm animate-fade-in"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
      }}
    >
      <div className="bg-[#141414] border border-[#30363d] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#222] flex items-center justify-between bg-[#161b22]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <FolderDown className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">Xuất File Toàn Văn</h2>
              <p className="text-xs text-gray-400 truncate max-w-[220px]">{projectData.projectName}</p>
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
          {/* Summary Card */}
          <div className="p-3.5 rounded-xl bg-[#1c2128] border border-[#30363d] space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Tên tệp xuất:</span>
              <span className="font-mono text-emerald-400 font-bold truncate max-w-[190px]">{filename}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Số chương đã dịch:</span>
              <span className="font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                {totalTranslated} / {projectData.rawChapters.length} Chương
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Môi trường:</span>
              <span className="font-mono text-[11px] text-gray-300">
                {isNative ? '📱 Android Native APK' : '🌐 Web Client / Trình duyệt'}
              </span>
            </div>
          </div>

          {/* Status Alert */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border text-xs space-y-1 animate-fade-in ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
                  : statusMessage.type === 'warning'
                  ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                  : 'bg-blue-950/40 border-blue-800/60 text-blue-200'
              }`}
            >
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{statusMessage.text}</span>
              </div>
              {statusMessage.path && (
                <div className="font-mono text-[10px] text-gray-300 bg-black/40 p-1.5 rounded select-all break-all">
                  Đường dẫn: {statusMessage.path}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            {/* Action 1: Auto Download directly to /Download */}
            <button
              onClick={handleAutoDownload}
              disabled={isProcessing || totalTranslated === 0}
              className="w-full p-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm flex items-center justify-between shadow-lg transition cursor-pointer select-none"
            >
              <div className="flex items-center gap-3 text-left">
                {isProcessing ? (
                  <RefreshCw className="w-5 h-5 text-white animate-spin shrink-0" />
                ) : (
                  <FolderDown className="w-5 h-5 text-white shrink-0" />
                )}
                <div>
                  <div className="font-bold">
                    {isNative ? 'Lưu Ngay Vào Thư Mục Tải Về (/Download)' : 'Tải Xuống Tệp (.txt)'}
                  </div>
                  <div className="text-[10px] text-blue-100/80 font-normal">
                    {isNative
                      ? 'Tự động tạo tệp qua MediaStore API (Không cần hỏi)'
                      : 'Kích hoạt trình tải của trình duyệt'}
                  </div>
                </div>
              </div>
              <Download className="w-4 h-4 text-white shrink-0" />
            </button>

            {/* Action 2: Storage Access Framework (SAF) system picker */}
            {isNative && (
              <button
                onClick={handleSafExport}
                disabled={isProcessing || totalTranslated === 0}
                className="w-full p-3.5 rounded-xl bg-[#21262d] hover:bg-[#30363d] disabled:opacity-50 text-gray-200 border border-[#30363d] font-semibold text-xs sm:text-sm flex items-center justify-between transition cursor-pointer select-none"
              >
                <div className="flex items-center gap-3 text-left">
                  <FolderPlus className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-bold text-white">Chọn Nơi Lưu Tùy Ý (Hộp Thoại SAF)</div>
                    <div className="text-[10px] text-gray-400 font-normal">
                      Mở trình chọn tệp Android (Lưu vào Thẻ nhớ SD, Documents...)
                    </div>
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              </button>
            )}
          </div>

          {/* Android Permissions Link */}
          {isNative && (
            <div className="pt-2 border-t border-gray-800 text-center">
              <button
                onClick={handleOpenPermissions}
                className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Cần mở quyền Quản lý Tệp Android? Bấm vào đây</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#222] flex justify-end bg-[#111]">
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
