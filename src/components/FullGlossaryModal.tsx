import React, { useState } from 'react';
import { X, Search, Plus, Trash2, Edit2, Download } from 'lucide-react';
import { ProjectData } from '../types';

interface FullGlossaryModalProps {
  projectData: ProjectData;
  onClose: () => void;
  onUpdateGlossary: (glossary: Record<string, string>) => void;
  onOpenEditModal: (raw: string, vi: string) => void;
  onExportGlossary: () => void;
}

export const FullGlossaryModal: React.FC<FullGlossaryModalProps> = ({
  projectData,
  onClose,
  onUpdateGlossary,
  onOpenEditModal,
  onExportGlossary,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [newRaw, setNewRaw] = useState<string>('');
  const [newVi, setNewVi] = useState<string>('');

  const entries = Object.entries(projectData.masterGlossary);
  const filteredEntries = entries.filter(([k, v]) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return k.toLowerCase().includes(q) || v.toLowerCase().includes(q);
  });

  const handleAddInline = () => {
    const k = newRaw.trim();
    const v = newVi.trim();
    if (!k || !v) return;

    onUpdateGlossary({
      ...projectData.masterGlossary,
      [k]: v,
    });
    setNewRaw('');
    setNewVi('');
  };

  const handleDelete = (key: string) => {
    const updated = { ...projectData.masterGlossary };
    delete updated[key];
    onUpdateGlossary(updated);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-6 backdrop-blur-sm"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
      }}
    >
      <div className="bg-[#141414] border border-[#30363d] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#222] flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              Kho Từ Điển Master Glossary ({entries.length} từ)
            </h2>
            <p className="text-xs text-gray-400">Dự án: {projectData.projectName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-4 border-b border-[#222] space-y-3 bg-[#161b22]">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm từ gốc hoặc nghĩa dịch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Add quick inline */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Từ gốc (VD: 林辰)"
              value={newRaw}
              onChange={(e) => setNewRaw(e.target.value)}
              className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
            <input
              type="text"
              placeholder="Nghĩa dịch (VD: Lâm Thần)"
              value={newVi}
              onChange={(e) => setNewVi(e.target.value)}
              className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleAddInline}
              disabled={!newRaw.trim() || !newVi.trim()}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm</span>
            </button>
          </div>
        </div>

        {/* Entry List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-xs">
              {searchQuery ? 'Không tìm thấy thuật ngữ nào phù hợp!' : 'Kho từ điển đang trống.'}
            </div>
          ) : (
            filteredEntries.map(([raw, vi]) => (
              <div
                key={raw}
                className="flex items-center justify-between p-2.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs hover:border-gray-600 transition"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className="font-bold text-white truncate">{raw}</span>
                  <span className="text-emerald-400 font-medium">➔ {vi}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onOpenEditModal(raw, vi)}
                    className="p-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded transition cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(raw)}
                    className="p-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded border border-rose-900/50 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#222] bg-[#141414] flex items-center justify-between">
          <button
            onClick={onExportGlossary}
            className="px-3.5 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-200 text-xs font-semibold rounded-lg border border-[#30363d] transition cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất .txt / Copy</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
