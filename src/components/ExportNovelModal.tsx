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
  ChevronDown,
  ChevronUp,
  Smartphone,
  HardDrive,
} from 'lucide-react';
import { ProjectData } from '../types';
import {
  triggerDirectDownload,
  triggerDataUriDownload,
  triggerAndroidNativeShare,
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
  const [copied, setCopied] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'info' | 'success' | 'warning' | 'error' } | null>(null);
  const [showPreview, setShowPreview] = useState<boolean>(false);

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

  // 1. Tải trực tiếp bằng Blob Stream vào /storage/emulated/0/Download/
  const handleBlobDownload = () => {
    setIsExporting(true);
    try {
      const fullText = buildFullNovelText();
      const ok = triggerDirectDownload(filename, fullText);
      if (ok) {
        const msg = `✅ Đã gửi tệp ${filename} vào thư mục /storage/emulated/0/Download/. Hãy kiểm tra bảng thông báo tải xuống của Android!`;
        setStatusMessage({ text: msg, type: 'success' });
        onAddLog(msg, 'success');
      } else {
        // Tự động fallback sang Data URI nếu Blob bị từ chối
        const dataOk = triggerDataUriDownload(filename, fullText);
        if (dataOk) {
          const msg = `✅ Đã tải tệp ${filename} qua Data URI vào thư mục Download của máy!`;
          setStatusMessage({ text: msg, type: 'success' });
          onAddLog(msg, 'success');
        } else {
          setStatusMessage({ text: '❌ Không thể tải tệp trực tiếp.', type: 'error' });
        }
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setStatusMessage({ text: `Lỗi tải tệp: ${errorMsg}`, type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Tải trực tiếp bằng Data URI (Khuyên dùng khi trình duyệt mobile chặn Blob)
  const handleDataUriDownload = () => {
    setIsExporting(true);
    try {
      const fullText = buildFullNovelText();
      const ok = triggerDataUriDownload(filename, fullText);
      if (ok) {
        const msg = `✅ Đã kích hoạt tải tệp ${filename} bằng luồng Data URI vào /storage/emulated/0/Download/!`;
        setStatusMessage({ text: msg, type: 'success' });
        onAddLog(msg, 'success');
      } else {
        setStatusMessage({ text: '❌ Không thể tải qua Data URI.', type: 'error' });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setStatusMessage({ text: `Lỗi tải: ${errorMsg}`, type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  // 3. Mở Hộp thoại Lưu Tệp / Chia Sẻ Gốc của Android (Share Sheet)
  const handleAndroidShare = async () => {
    setIsExporting(true);
    setStatusMessage({ text: 'Đang mở bảng chia sẻ/lưu tệp Android...', type: 'info' });
    try {
      const fullText = buildFullNovelText();
      const res = await triggerAndroidNativeShare(filename, fullText);
      setStatusMessage({ text: res.message, type: res.success ? 'success' : 'warning' });
      onAddLog(res.message, res.success ? 'success' : 'warning');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setStatusMessage({ text: `Lỗi chia sẻ: ${errorMsg}`, type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  // 4. Sao chép toàn bộ vào Clipboard
  const handleCopyClipboard = () => {
    const fullText = buildFullNovelText();
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    const msg = `📋 Đã sao chép toàn bộ ${totalTranslated} chương vào Bộ nhớ tạm (Clipboard)! Bạn có thể dán vào bất cứ đâu.`;
    setStatusMessage({ text: msg, type: 'success' });
    onAddLog(msg, 'success');
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
              <h2 className="text-sm sm:text-base font-bold text-white">Xuất Toàn Văn Ra Bộ Nhớ Máy</h2>
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
          {/* File summary pill & Destination Path */}
          <div className="p-3 rounded-xl bg-[#1c2128] border border-[#30363d] space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-300">
                <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-mono font-medium truncate max-w-[210px]">{filename}</span>
              </div>
              <span className="font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20">
                {totalTranslated} / {projectData.rawChapters.length} Chương
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 pt-1 border-t border-gray-800">
              <HardDrive className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Đường dẫn lưu trên Android: <code className="text-amber-300 font-mono">/storage/emulated/0/Download/</code></span>
            </div>
          </div>

          {/* Status Alert if triggered */}
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

          {/* Action options */}
          <div className="space-y-2.5">
            {/* Option 1: Direct Download into Android /Download */}
            <button
              onClick={handleBlobDownload}
              disabled={isExporting || totalTranslated === 0}
              className="w-full p-3.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-medium text-xs sm:text-sm flex items-center justify-between shadow-lg transition cursor-pointer disabled:opacity-40"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Download className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="font-bold">Tải Vào Thư Mục /Download (.txt)</div>
                  <div className="text-[11px] text-blue-100/80">Lưu vào bộ nhớ trong /storage/emulated/0/Download/</div>
                </div>
              </div>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-mono font-bold">Khuyên dùng</span>
            </button>

            {/* Option 2: Fallback Data URI Download */}
            <button
              onClick={handleDataUriDownload}
              disabled={isExporting || totalTranslated === 0}
              className="w-full p-3.5 rounded-xl bg-[#1e293b] hover:bg-[#283548] border border-blue-500/30 text-gray-100 font-medium text-xs sm:text-sm flex items-center justify-between transition cursor-pointer disabled:opacity-40"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center border border-teal-500/30">
                  <FolderDown className="w-4 h-4 text-teal-400" />
                </div>
                <div>
                  <div className="font-bold">Tải Dự Phòng (Data URI Stream)</div>
                  <div className="text-[11px] text-gray-400">Dành riêng nếu máy bạn bị trình duyệt chặn tệp Blob</div>
                </div>
              </div>
            </button>

            {/* Option 3: Android Native Share Sheet */}
            <button
              onClick={handleAndroidShare}
              disabled={isExporting || totalTranslated === 0}
              className="w-full p-3.5 rounded-xl bg-[#1c221a] hover:bg-[#253022] border border-emerald-500/30 text-gray-100 font-medium text-xs sm:text-sm flex items-center justify-between transition cursor-pointer disabled:opacity-40"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="font-bold">Mở Trình Lưu Hệ Thống Android (Share Sheet)</div>
                  <div className="text-[11px] text-gray-400">Chọn Google Files, Drive, Zalo, Thẻ nhớ SD...</div>
                </div>
              </div>
              <Share2 className="w-4 h-4 text-emerald-400" />
            </button>

            {/* Option 4: Copy to Clipboard */}
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
                  <div className="font-bold">{copied ? 'Đã sao chép vào Clipboard!' : 'Sao Chép Toàn Bộ Tác Phẩm (1 Chạm)'}</div>
                  <div className="text-[11px] text-gray-400">Dán nhanh vào bất kỳ ứng dụng đọc sách nào trên điện thoại</div>
                </div>
              </div>
            </button>
          </div>

          {/* Collapsible Preview Box */}
          <div className="pt-2 border-t border-gray-800">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="w-full flex items-center justify-between text-xs text-gray-400 hover:text-white py-1 cursor-pointer"
            >
              <span>Xem trước toàn bộ văn bản xuất ({totalTranslated} chương)</span>
              {showPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showPreview && (
              <div className="mt-2 p-3 bg-black/60 rounded-xl border border-gray-800 max-h-48 overflow-y-auto">
                <pre className="text-[11px] text-gray-300 font-sans whitespace-pre-wrap select-text">
                  {buildFullNovelText()}
                </pre>
              </div>
            )}
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
