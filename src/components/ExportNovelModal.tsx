import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  FolderDown,
  Info,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { ProjectData } from '../types';
import {
  exportNovelStandard,
  openAndroidStorageSettings,
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
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'info' | 'success' | 'warning' | 'error' } | null>(null);
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [downloadTriggered, setDownloadTriggered] = useState<boolean>(false);

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

  // Khởi tạo trước URL Blob để gắn trực tiếp vào thẻ <a href download>
  // Đảm bảo thao tác chạm ngón tay của người dùng là Trusted User Gesture trên Android Chrome
  useEffect(() => {
    try {
      const fullText = buildFullNovelText();
      const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    } catch (e) {
      console.error('Lỗi tạo URL tải trước:', e);
    }
  }, [projectData]);

  // Xử lý khi người dùng chạm nút tải
  const handlePrimaryExport = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    setDownloadTriggered(true);

    // Nếu đang chạy trên APK Native Android (Capacitor)
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.RootBridge) {
      e.preventDefault(); // Dùng luồng Native Java
      setStatusMessage({ text: 'Đang mở trình lưu tệp hệ thống Android...', type: 'info' });
      try {
        const fullText = buildFullNovelText();
        const res = await exportNovelStandard(filename, fullText);
        if (res.success) {
          setStatusMessage({ text: `✅ ${res.message}`, type: 'success' });
          onAddLog(res.message, 'success');
        } else {
          setStatusMessage({ text: res.message, type: 'warning' });
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setStatusMessage({ text: `Lỗi xuất tệp: ${errorMsg}`, type: 'error' });
      }
      return;
    }

    // Nếu đang chạy trên trình duyệt Web/PWA:
    // Thẻ <a> với href={blobUrl} và download={filename} sẽ tự động kích hoạt tiến trình tải của Android Chrome
    setStatusMessage({
      text: `✅ Đang tải ${filename}. Hãy kiểm tra thanh thông báo trạng thái của Android!`,
      type: 'success',
    });
    onAddLog(`Đã tải xuống tệp: ${filename}`, 'success');
  };

  // Mở Cài đặt cấp quyền bộ nhớ Android
  const handleOpenPermissions = async () => {
    try {
      await openAndroidStorageSettings();
      onAddLog('Đã mở màn hình cấp quyền Quản lý Tệp của Android.', 'info');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert(`Không thể mở Cài đặt: ${errorMsg}`);
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
          </div>

          {/* Status Alert */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 animate-fade-in ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
                  : 'bg-blue-950/40 border-blue-800/60 text-blue-200'
              }`}
            >
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Primary Action Button (Direct <a> link with pre-bound download href) */}
          <div className="space-y-3 pt-1">
            <a
              href={blobUrl || '#'}
              download={filename}
              onClick={handlePrimaryExport}
              className="w-full p-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm flex items-center justify-between shadow-lg transition cursor-pointer select-none"
            >
              <div className="flex items-center gap-3 text-left">
                <FolderDown className="w-5 h-5 text-white shrink-0" />
                <div>
                  <div className="font-bold">
                    {downloadTriggered ? 'Tải Lại Tệp (.txt)' : 'Tải Tệp Về Máy (/Download)'}
                  </div>
                  <div className="text-[11px] text-blue-100/80 font-normal">
                    Lưu vào thư mục /storage/emulated/0/Download/
                  </div>
                </div>
              </div>
              {downloadTriggered ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              ) : (
                <Download className="w-4 h-4 text-white" />
              )}
            </a>
          </div>

          {/* Android Permissions Link */}
          <div className="pt-3 border-t border-gray-800 text-center">
            <button
              onClick={handleOpenPermissions}
              className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Chưa cấp quyền bộ nhớ? Bấm để mở Cài đặt Android</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
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
