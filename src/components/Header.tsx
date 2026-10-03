import React from 'react';
import { BookOpen, Cpu, ShieldCheck, KeyRound, FolderArchive } from 'lucide-react';
import { AppSettings, ApiKeyItem } from '../types';

interface HeaderProps {
  settings: AppSettings;
  apiKeys: ApiKeyItem[];
  onOpenProjectModal: () => void;
  onDownloadSourceCode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  apiKeys,
  onOpenProjectModal,
  onDownloadSourceCode,
}) => {
  const activeKeysCount = apiKeys.filter((k) => k.state === 'ACTIVE').length;

  return (
    <header className="bg-[#141414] border-b border-[#222222] px-4 py-3 sticky top-0 z-30 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-inner">
          <BookOpen className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">DroidTranslator Native</h1>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
              <ShieldCheck className="w-3 h-3" />
              GOD-MODE
            </span>
          </div>
          <p className="text-[11px] text-gray-400">Gemini Multi-Key Novel Translation Engine</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onDownloadSourceCode && (
          <button
            onClick={onDownloadSourceCode}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-900/40 hover:bg-purple-800 text-xs text-purple-200 border border-purple-500/40 transition cursor-pointer"
            title="Tải toàn bộ mã nguồn React SPA (.ZIP)"
          >
            <FolderArchive className="w-3.5 h-3.5 text-purple-300" />
            <span className="hidden sm:inline font-medium">Tải Code (.ZIP)</span>
          </button>
        )}

        <button
          onClick={onOpenProjectModal}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1e1e1e] hover:bg-[#282828] border border-[#333] text-xs text-blue-400 transition cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="max-w-[130px] truncate font-medium">{settings.currentProjectName}</span>
        </button>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1a2333] border border-blue-500/30 text-xs text-blue-300">
          <Cpu className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-mono text-[11px] hidden md:inline">{settings.currentModel.replace('gemini-', '')}</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1c221a] border border-emerald-500/30 text-xs text-emerald-300">
          <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-mono text-[11px] font-bold">{activeKeysCount}/{apiKeys.length} Keys</span>
        </div>
      </div>
    </header>
  );
};
