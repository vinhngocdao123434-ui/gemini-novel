import React, { useState } from 'react';
import {
  BookOpen,
  Download,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Zap,
  Clock,
  AlertTriangle,
  Wrench,
  SearchCheck,
  RefreshCw,
} from 'lucide-react';
import { ProjectData } from '../types';

interface TabReaderProps {
  projectData: ProjectData;
  isTranslating: boolean;
  currentTranslatingIndex: number;
  isScanningQuality?: boolean;
  onOpenReader: (chapterIndex: number) => void;
  onExportFullNovel: () => void;
  onScanAllQuality: () => void;
  onRetranslateErrors: () => void;
}

const CHAPTERS_PER_PAGE = 100;

export const TabReader: React.FC<TabReaderProps> = ({
  projectData,
  isTranslating,
  currentTranslatingIndex,
  isScanningQuality = false,
  onOpenReader,
  onExportFullNovel,
  onScanAllQuality,
  onRetranslateErrors,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(0);
  const totalChapters = projectData.rawChapters.length;
  const totalPages = Math.max(1, Math.ceil(totalChapters / CHAPTERS_PER_PAGE));

  const startIdx = currentPage * CHAPTERS_PER_PAGE;
  const endIdx = Math.min(startIdx + CHAPTERS_PER_PAGE, totalChapters);
  const currentChapterSlice = projectData.rawChapters.slice(startIdx, endIdx);

  // Count errors
  const auditStatuses = projectData.chapterAuditStatus || {};
  const errorChapterCount = Object.values(auditStatuses).filter(
    (a) => a.status === 'critical'
  ).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top action card */}
      <section className="bg-[#141414] border border-[#222] rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-400" />
              Danh Sách Các Chương &amp; Kiểm Định Chất Lượng
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Tích hợp hệ thống kiểm tra lỗi offline và tự động sửa chữa. Nhấp vào chương để mở Trình Đọc AMOLED / Sepia.
            </p>
          </div>

          <button
            onClick={onExportFullNovel}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-2 shadow-sm shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Xuất Toàn Văn (.txt)</span>
          </button>
        </div>

        {/* Audit Quality Actions Bar */}
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-[#161b22] border border-[#30363d]">
          <div className="flex items-center gap-1.5 text-xs text-gray-300 mr-auto">
            <SearchCheck className="w-4 h-4 text-emerald-400" />
            <span>Kiểm định nội dung:</span>
            {errorChapterCount > 0 ? (
              <span className="font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/30">
                {errorChapterCount} chương lỗi nặng
              </span>
            ) : (
              <span className="font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                Toàn bộ đạt chuẩn
              </span>
            )}
          </div>

          <button
            onClick={onScanAllQuality}
            disabled={isScanningQuality || Object.keys(projectData.translatedChapters).length === 0}
            className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] disabled:opacity-50 text-gray-200 text-xs font-semibold rounded-lg border border-[#30363d] transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isScanningQuality ? 'animate-spin' : ''}`} />
            <span>{isScanningQuality ? 'Đang quét...' : 'Quét Toàn Bộ Offline'}</span>
          </button>

          {errorChapterCount > 0 && (
            <button
              onClick={onRetranslateErrors}
              disabled={isTranslating}
              className="px-3 py-1.5 bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-900/30"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Dịch Lại {errorChapterCount} Chương Lỗi (Ghi Đè)</span>
            </button>
          )}
        </div>

        {/* Pagination controls */}
        {totalChapters > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-[#222]">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1.5 bg-[#1e293b] hover:bg-[#283548] disabled:opacity-40 text-gray-300 text-xs font-semibold rounded-lg border border-[#334155] transition flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Trước</span>
            </button>

            <span className="text-xs font-medium text-blue-300 font-mono">
              Trang {currentPage + 1} / {totalPages} ({totalChapters} chương)
            </span>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage >= totalPages - 1}
              className="px-3 py-1.5 bg-[#1e293b] hover:bg-[#283548] disabled:opacity-40 text-gray-300 text-xs font-semibold rounded-lg border border-[#334155] transition flex items-center gap-1 cursor-pointer"
            >
              <span>Sau</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </section>

      {/* Chapter List */}
      <div className="space-y-2">
        {totalChapters === 0 ? (
          <div className="bg-[#141414] border border-[#222] rounded-xl p-8 text-center text-gray-500 text-xs">
            Chưa có chương nào trong dự án này. Hãy nạp nội dung ở Thẻ 2 (Dịch &amp; Từ điển)!
          </div>
        ) : (
          currentChapterSlice.map((chapText, localIdx) => {
            const actualIdx = startIdx + localIdx;
            const isDone = actualIdx in projectData.translatedChapters;
            const isCurrentlyTranslating = isTranslating && currentTranslatingIndex === actualIdx;
            const auditInfo = auditStatuses[actualIdx];

            const firstLine = chapText.split('\n')[0] || `Chương ${actualIdx + 1}`;
            const displayTitle = firstLine.length > 45 ? firstLine.slice(0, 45) + '...' : firstLine;

            let cardBg = 'bg-[#161b22] border-[#30363d] hover:border-gray-500';
            if (isCurrentlyTranslating) {
              cardBg = 'bg-[#172554] border-blue-500 ring-1 ring-blue-500';
            } else if (isDone) {
              if (auditInfo?.status === 'critical') {
                cardBg = 'bg-[#4c0519]/40 border-rose-800/80 hover:border-rose-500';
              } else if (auditInfo?.status === 'healed') {
                cardBg = 'bg-[#042f2e]/40 border-teal-800/80 hover:border-teal-500';
              } else {
                cardBg = 'bg-[#064e3b]/40 border-emerald-800/80 hover:border-emerald-500';
              }
            }

            return (
              <div
                key={actualIdx}
                onClick={() => onOpenReader(actualIdx)}
                className={`p-3 sm:p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${cardBg}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs font-bold text-gray-400 w-10 shrink-0">
                    #{actualIdx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs sm:text-sm font-semibold text-white truncate">{displayTitle}</h3>
                      {auditInfo?.score !== undefined && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-gray-300">
                          {auditInfo.score}đ
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 truncate">
                      {isDone
                        ? projectData.translatedChapters[actualIdx].split('\n')[0]
                        : `${chapText.length} ký tự thô`}
                    </p>
                    {auditInfo && auditInfo.issues.length > 0 && (
                      <p className="text-[10px] text-amber-300/80 truncate mt-0.5">
                        ⚠️ {auditInfo.issues[0]}
                      </p>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {isCurrentlyTranslating && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-500/30">
                      <Zap className="w-3 h-3 animate-pulse text-blue-400" />
                      Đang dịch
                    </span>
                  )}

                  {!isCurrentlyTranslating && isDone && (
                    <>
                      {auditInfo?.status === 'critical' ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/30">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          Lỗi nặng
                        </span>
                      ) : auditInfo?.status === 'healed' ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-teal-400 bg-teal-500/20 px-2 py-0.5 rounded-full border border-teal-500/30">
                          <Wrench className="w-3 h-3 text-teal-400" />
                          Đã sửa offline
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Đã dịch
                        </span>
                      )}
                    </>
                  )}

                  {!isCurrentlyTranslating && !isDone && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                      <Clock className="w-3 h-3" />
                      Chờ
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
