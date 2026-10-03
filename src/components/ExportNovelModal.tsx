import React, { useState } from 'react';
import {
  X,
  Download,
  Share2,
  Copy,
  Check,
  FileText,
  FolderDown,
  Info,
} from 'lucide-react';
import { ProjectData } from '../types';
import { triggerDirectDownload, saveToDeviceStorageNative } from '../utils/fileDownloader';

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
  const [copied, setCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

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

  // 1. Lưu ra Bộ nhớ qua Native Android Picker / Share Sheet
  const handleNativeSave = async () => {
    setIsExporting(true);
    setStatusMessage('Đang mở bộ lưu tệp hệ thống Android...');
    try {
      const fullText = buildFullNovelText();
      const res = await saveToDeviceStorageNative(filename, fullText);
      setStatusMessage(res.message);
      onAddLog(res.message, res.success ? 'success' : 'warning');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setStatusMessage(`Lỗi khi lưu tệp: ${errorMsg}`);
      onAddLog(`Lỗi khi lưu tệp: ${errorMsg}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Tải trực tiếp vào /Download với ObjectURL bền vững
  const handleDirectDownload = () => {
    setIsExporting(true);
    try {
      const fullText = buildFullNovelText();
      const ok = triggerDirectDownload(filename, fullText);
      if (ok) {
        const msg = `✅ Đã kích hoạt lệnh tải ${filename}. Hãy kiểm tra thanh thông báo hoặc thư mục /Download của bạn!`;
        setStatusMessage(msg);
        onAddLog(msg, 'success');
      } else {
        const msg = '❌ Không thể kích hoạt tải tệp trực tiếp.';
        setStatusMessage(msg);
        onAddLog(msg, 'error');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setStatusMessage(`Lỗi tải tệp: ${errorMsg}`);
      onAddLog(`Lỗi tải tệp: ${errorMsg}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // 3. Sao chép toàn bộ vào Clipboard
  const handleCopyClipboard = () => {
    const fullText = buildFullNovelText();
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setStatusMessage(`📋 Đã sao chép toàn bộ ${totalTranslated} chương vào Bộ nhớ tạm (Clipboard)!`);
    onAddLog(`Đã sao chép toàn văn tác phẩm ${totalTranslated} chương vào Clipboard!`, 'success');
    setTimeout(() => setCopied(false), 2500);
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
      <div className="bg-[#141414] border border-[#30363d] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#222] flex items-center justify-between bg-[#161b22]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <FolderDown className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">Xuất File Toàn Văn Ra Bộ Nhớ</h2>
              <p className="text-xs text-gray-400">{projectData.projectName}</p>
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
          {/* File summary pill */}
          <div className="p-3 rounded-xl bg-[#1c2128] border border-[#30363d] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-gray-300">
              <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-mono font-medium truncate max-w-[200px]">{filename}</span>
            </div>
            <span className="font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
              {totalTranslated} / {projectData.rawChapters.length} Chương
            </span>
          </div>

          {/* Status Alert if triggered */}
          {statusMessage && (
            <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/60 text-xs text-blue-200 flex items-start gap-2 animate-fade-in">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Action options */}
          <div className="space-y-2.5">
            {/* Option 1: Native Android Share / Files */}
            <button
              onClick={handleNativeSave}
              disabled={isExporting || totalTranslated === 0}
              className="w-full p-3.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-medium text-xs sm:text-sm flex items-center justify-between shadow-lg transition cursor-pointer disabled:opacity-40"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Share2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="font-bold">Lưu Ra Bộ Nhớ Máy (Android Files / Share)</div>
                  <div className="text-[11px] text-blue-100/80">Chọn thư mục tùy ý (Download, Tài liệu, Drive, Zalo...)</div>
                </div>
              </div>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-mono font-bold">Khuyên dùng</span>
            </button>

            {/* Option 2: Direct Download into /Download */}
            <button
              onClick={handleDirectDownload}
              disabled={isExporting || totalTranslated === 0}
              className="w-full p-3.5 rounded-xl bg-[#1e293b] hover:bg-[#283548] border border-blue-500/30 text-gray-100 font-medium text-xs sm:text-sm flex items-center justify-between transition cursor-pointer disabled:opacity-40"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                  <Download className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="font-bold">Tải Thẳng Vào Thư Mục /Download (.txt)</div>
                  <div className="text-[11px] text-gray-400">Gửi lệnh tải trực tiếp vào trình quản lý download máy</div>
                </div>
              </div>
            </button>

            {/* Option 3: Copy to Clipboard */}
            <button
              onClick={handleCopyClipboard}
              disabled={isExporting || totalTranslated === 0}
              className="w-full p-3.5 rounded-xl bg-[#181818] hover:bg-[#222222] border border-[#333] text-gray-200 font-medium text-xs sm:text-sm flex items-center justify-between transition cursor-pointer disabled:opacity-40"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
                </div>
                <div>
                  <div className="font-bold">{copied ? 'Đã sao chép vào Clipboard!' : 'Sao Chép Toàn Bộ Vào Bộ Nhớ Tạm'}</div>
                  <div className="text-[11px] text-gray-400">Dán nhanh vào ứng dụng ghi chú hoặc trình đọc khác</div>
                </div>
              </div>
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
