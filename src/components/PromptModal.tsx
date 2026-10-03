import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { PromptCardItem } from '../types';

interface PromptModalProps {
  editingPrompt?: PromptCardItem | null;
  onClose: () => void;
  onSave: (title: string, content: string) => void;
}

export const PromptModal: React.FC<PromptModalProps> = ({ editingPrompt, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (editingPrompt) {
      setTitle(editingPrompt.title);
      setContent(editingPrompt.content);
    } else {
      setTitle('');
      setContent('');
    }
  }, [editingPrompt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onSave(title.trim(), content.trim());
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(1rem, env(safe-area-inset-right, 0px))',
      }}
    >
      <div className="bg-[#141414] border border-[#30363d] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in">
        <div className="p-4 sm:p-5 border-b border-[#222] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm sm:text-base font-bold text-white">
              {editingPrompt ? 'Sửa Thẻ Prompt' : 'Thêm Thẻ Prompt Mới'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Tiêu đề phong cách:</label>
            <input
              type="text"
              placeholder="VD: Tiên Hiệp, Đô Thị mượt mà, Huyền Huyễn..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Nội dung System Prompt:</label>
            <textarea
              rows={5}
              placeholder="Nhập hướng dẫn chi tiết cho AI khi dịch thể loại này..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-sans"
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition cursor-pointer"
            >
              Lưu Thẻ Prompt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
