import React, { useState, useEffect } from 'react';
import { X, Edit2 } from 'lucide-react';

interface EditGlossaryModalProps {
  initialRaw: string;
  initialVi: string;
  onClose: () => void;
  onSave: (oldRaw: string, newRaw: string, newVi: string) => void;
}

export const EditGlossaryModal: React.FC<EditGlossaryModalProps> = ({
  initialRaw,
  initialVi,
  onClose,
  onSave,
}) => {
  const [raw, setRaw] = useState(initialRaw);
  const [vi, setVi] = useState(initialVi);

  useEffect(() => {
    setRaw(initialRaw);
    setVi(initialVi);
  }, [initialRaw, initialVi]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!raw.trim() || !vi.trim()) return;
    onSave(initialRaw, raw.trim(), vi.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#141414] border border-[#30363d] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in">
        <div className="p-4 sm:p-5 border-b border-[#222] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm sm:text-base font-bold text-white">Chỉnh Sửa Thuật Ngữ</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-blue-300 mb-1">
              Từ gốc (Tiếng Trung / Raw):
            </label>
            <input
              type="text"
              placeholder="VD: 林辰"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              required
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-emerald-300 mb-1">
              Nghĩa dịch tiếng Việt chuẩn:
            </label>
            <input
              type="text"
              placeholder="VD: Lâm Thần"
              value={vi}
              onChange={(e) => setVi(e.target.value)}
              required
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-300 text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition cursor-pointer"
            >
              Lưu Thay Đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
