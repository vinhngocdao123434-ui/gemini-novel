import React, { useState } from 'react';
import { X, BookOpen, Plus, Check } from 'lucide-react';

interface ProjectModalProps {
  mode: 'switch' | 'new';
  currentProject: string;
  projectList: string[];
  onClose: () => void;
  onSelectProject: (name: string) => void;
  onCreateProject: (name: string) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  mode,
  currentProject,
  projectList,
  onClose,
  onSelectProject,
  onCreateProject,
}) => {
  const [newProjectName, setNewProjectName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitized = newProjectName.trim().replace(/\s+/g, '_');
    if (!sanitized) return;
    onCreateProject(sanitized);
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
      <div className="bg-[#141414] border border-[#30363d] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in">
        <div className="p-4 sm:p-5 border-b border-[#222] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm sm:text-base font-bold text-white">
              {mode === 'new' ? 'Tạo Dự Án Dịch Mới' : 'Chọn Dự Án Truyện'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {mode === 'new' ? (
          <form onSubmit={handleCreate} className="p-4 sm:p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Tên dự án truyện:</label>
              <input
                type="text"
                placeholder="VD: Tien_Nghich, Pham_Nhan_Tu_Tien..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                autoFocus
                required
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Khoảng trắng sẽ tự động được thay bằng dấu gạch dưới `_`.
              </p>
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
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo Mới</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
            {projectList.map((pName) => {
              const isSelected = pName === currentProject;
              return (
                <div
                  key={pName}
                  onClick={() => {
                    onSelectProject(pName);
                    onClose();
                  }}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-[#1e293b] border-blue-500 text-white font-bold'
                      : 'bg-[#161b22] border-[#30363d] text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <BookOpen className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-gray-400'}`} />
                    <span className="text-xs truncate">{pName}</span>
                  </div>

                  {isSelected && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-500/30">
                      <Check className="w-3 h-3" /> Đang chọn
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
