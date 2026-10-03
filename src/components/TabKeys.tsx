import React, { useState } from 'react';
import { KeyRound, Plus, Sparkles, Check, Trash2, Edit3, Cpu, RefreshCw } from 'lucide-react';
import { ApiKeyItem, PromptCardItem, AppSettings } from '../types';
import { GeminiEngine } from '../utils/geminiEngine';

interface TabKeysProps {
  settings: AppSettings;
  apiKeys: ApiKeyItem[];
  promptCards: PromptCardItem[];
  engine: GeminiEngine;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onUpdateKeys: (keys: ApiKeyItem[]) => void;
  onUpdatePrompts: (prompts: PromptCardItem[]) => void;
  onOpenPromptModal: (prompt?: PromptCardItem) => void;
  onAddLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error' | 'ai') => void;
}

const PRESET_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.5-flash-lite', 'gemini-2.5-pro'];

export const TabKeys: React.FC<TabKeysProps> = ({
  settings,
  apiKeys,
  promptCards,
  engine,
  onUpdateSettings,
  onUpdateKeys,
  onUpdatePrompts,
  onOpenPromptModal,
  onAddLog,
}) => {
  const [customModelInput, setCustomModelInput] = useState('');
  const [newKeyInput, setNewKeyInput] = useState('');
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [testingKeyIndex, setTestingKeyIndex] = useState<number | null>(null);

  const handleSelectModel = (model: string) => {
    onUpdateSettings({ currentModel: model });
    onAddLog(`⚙️ Đã chọn mô hình: ${model}`, 'info');
  };

  const handleSetCustomModel = () => {
    const trimmed = customModelInput.trim();
    if (trimmed) {
      onUpdateSettings({ currentModel: trimmed });
      onAddLog(`⚙️ Đã kích hoạt mô hình tùy biến: ${trimmed}`, 'success');
      setCustomModelInput('');
    }
  };

  const handleAddKeys = () => {
    const raw = newKeyInput.trim();
    if (!raw) return;

    const lines = raw.split('\n');
    let countAdded = 0;
    const currentKeys = [...apiKeys];

    for (const line of lines) {
      const single = line.trim().replace(/['"]/g, '');
      if (single.length >= 8 && !single.startsWith('#') && !single.startsWith('//')) {
        const exists = currentKeys.some((k) => k.key === single);
        if (!exists) {
          currentKeys.push({
            key: single,
            state: 'ACTIVE',
            cooldownUntil: 0,
            totalRequests: 0,
            successRequests: 0,
          });
          countAdded++;
        }
      }
    }

    onUpdateKeys(currentKeys);
    setNewKeyInput('');
    onAddLog(`🔑 Đã nạp thành công ${countAdded} Key vào Pool!`, 'success');
  };

  const handleTestSingleKey = async (index: number) => {
    const targetKey = apiKeys[index];
    if (!targetKey) return;

    setTestingKeyIndex(index);
    const updated = [...apiKeys];
    updated[index].state = 'TESTING';
    onUpdateKeys(updated);

    const ok = await engine.testKey(targetKey);
    updated[index].state = ok ? 'ACTIVE' : 'ERROR';
    onUpdateKeys([...updated]);
    setTestingKeyIndex(null);

    if (ok) {
      onAddLog(`✅ Key #${index + 1} (...${targetKey.key.slice(-6)}) hoạt động tốt!`, 'success');
    } else {
      onAddLog(`❌ Key #${index + 1} (...${targetKey.key.slice(-6)}) bị lỗi hoặc hết hạn!`, 'error');
    }
  };

  const handleTestAllKeys = async () => {
    if (apiKeys.length === 0) return;
    setIsTestingAll(true);
    onAddLog(`⏳ Đang kiểm tra toàn bộ ${apiKeys.length} API Key...`, 'info');

    const updated = [...apiKeys];
    for (let i = 0; i < updated.length; i++) {
      setTestingKeyIndex(i);
      await engine.testKey(updated[i]);
      onUpdateKeys([...updated]);
    }

    setTestingKeyIndex(null);
    setIsTestingAll(false);
    onAddLog(`🎉 Đã hoàn tất kiểm tra toàn bộ Key Pool!`, 'success');
  };

  const handleDeleteKey = (index: number) => {
    const updated = apiKeys.filter((_, i) => i !== index);
    onUpdateKeys(updated);
    onAddLog(`🗑️ Đã xóa Key #${index + 1} khỏi Pool.`, 'info');
  };

  const handleSelectPrompt = (id: number) => {
    const updated = promptCards.map((p) => ({
      ...p,
      active: p.id === id,
    }));
    onUpdatePrompts(updated);
    const chosen = promptCards.find((p) => p.id === id);
    onAddLog(`📝 Đã chọn phong cách dịch: ${chosen?.title}`, 'info');
  };

  const handleDeletePrompt = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (promptCards.length <= 1) {
      onAddLog('⚠️ Phải giữ lại ít nhất 1 thẻ Prompt!', 'warning');
      return;
    }
    const updated = promptCards.filter((p) => p.id !== id);
    if (!updated.some((p) => p.active)) {
      updated[0].active = true;
    }
    onUpdatePrompts(updated);
    onAddLog(`🗑️ Đã xóa thẻ prompt.`, 'info');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Chọn Dòng Model Gemini */}
      <section className="bg-[#141414] border border-[#222] rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Cpu className="w-5 h-5 text-blue-400" />
          <h2 className="text-sm sm:text-base font-bold text-white">1. Chọn Dòng Model Gemini</h2>
        </div>
        <p className="text-xs text-blue-400 font-mono mb-3">
          Model đang chọn: <span className="font-bold underline">{settings.currentModel}</span>
        </p>

        {/* Preset Model Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {PRESET_MODELS.map((model) => {
            const isSelected = settings.currentModel === model;
            const shortName = model.replace('gemini-', '');
            return (
              <button
                key={model}
                onClick={() => handleSelectModel(model)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                  isSelected
                    ? 'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-500/20'
                    : 'bg-[#1b1f27] border-[#2d3748] text-gray-300 hover:bg-[#252c38]'
                }`}
              >
                {shortName}
              </button>
            );
          })}
        </div>

        {/* Custom Model Input */}
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <input
            type="text"
            placeholder="Nhập model tùy biến (VD: gemini-3.5-flash-lite, gemini-exp-1206)..."
            value={customModelInput}
            onChange={(e) => setCustomModelInput(e.target.value)}
            className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleSetCustomModel}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            Dùng Model Này
          </button>
        </div>
      </section>

      {/* 2. Multi-Key Gemini Pool */}
      <section className="bg-[#141414] border border-[#222] rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">2. Multi-Key Gemini Pool</h2>
              <p className="text-[11px] text-gray-400">Luân chuyển Round-Robin tự động &amp; tự hồi phục khi dính Rate Limit (429)</p>
            </div>
          </div>
          <button
            onClick={handleTestAllKeys}
            disabled={isTestingAll || apiKeys.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTestingAll ? 'animate-spin' : ''}`} />
            <span>Test Tất Cả</span>
          </button>
        </div>

        {/* Bulk Input Key */}
        <div className="space-y-2 mb-4">
          <textarea
            rows={2}
            placeholder="Dán API Key (Hỗ trợ nạp hàng loạt: mỗi dòng 1 key, tự động loại bỏ dấu nháy)..."
            value={newKeyInput}
            onChange={(e) => setNewKeyInput(e.target.value)}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 font-mono"
          />
          <button
            onClick={handleAddKeys}
            disabled={!newKeyInput.trim()}
            className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm API Key Vào Pool</span>
          </button>
        </div>

        {/* Key List */}
        <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
          {apiKeys.length === 0 ? (
            <p className="text-xs text-gray-500 py-3 text-center">Chưa có API Key nào trong kho. Hãy thêm ít nhất 1 Key để dịch truyện!</p>
          ) : (
            apiKeys.map((item, idx) => {
              const masked = item.key.length > 8 ? `...${item.key.slice(-8)}` : item.key;
              const isCurrentlyTesting = testingKeyIndex === idx;

              let badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
              if (item.state === 'COOLDOWN') badgeColor = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
              if (item.state === 'ERROR' || item.state === 'INVALID') badgeColor = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
              if (item.state === 'TESTING' || isCurrentlyTesting) badgeColor = 'bg-blue-500/20 text-blue-400 border-blue-500/30';

              return (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-[#161b22] border border-[#30363d] text-xs"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="font-mono text-gray-400 font-bold">#{idx + 1}</span>
                    <span className="font-mono text-white font-medium truncate">{masked}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${badgeColor}`}>
                      {isCurrentlyTesting ? 'TESTING...' : item.state}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 justify-between sm:justify-end">
                    <span className="text-[11px] text-gray-400 font-mono">
                      {item.successRequests}/{item.totalRequests} reqs
                    </span>

                    <button
                      onClick={() => handleTestSingleKey(idx)}
                      disabled={isCurrentlyTesting}
                      className="px-2.5 py-1 bg-[#21262d] hover:bg-[#30363d] text-gray-200 rounded border border-[#30363d] transition cursor-pointer"
                    >
                      {isCurrentlyTesting ? '...' : 'Test'}
                    </button>

                    <button
                      onClick={() => handleDeleteKey(idx)}
                      className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded border border-rose-900/50 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 3. Thẻ Prompt Dịch Thuật */}
      <section className="bg-[#141414] border border-[#222] rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">3. Thẻ Prompt Dịch Thuật</h2>
              <p className="text-[11px] text-gray-400">Chọn văn phong dịch truyện hoặc tạo mẫu riêng cho từng thể loại</p>
            </div>
          </div>
          <button
            onClick={() => onOpenPromptModal()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Prompt</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {promptCards.map((p) => {
            return (
              <div
                key={p.id}
                onClick={() => handleSelectPrompt(p.id)}
                className={`p-4 rounded-xl border transition cursor-pointer relative flex flex-col justify-between ${
                  p.active
                    ? 'bg-[#1e293b] border-blue-500 shadow-md shadow-blue-500/10 ring-1 ring-blue-500'
                    : 'bg-[#161b22] border-[#30363d] hover:border-[#4b5563]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <h3 className={`text-xs sm:text-sm font-bold ${p.active ? 'text-blue-400' : 'text-white'}`}>
                        {p.title}
                      </h3>
                      {p.active && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-blue-300 bg-blue-500/20 px-1.5 py-0.5 rounded-full border border-blue-500/30">
                          <Check className="w-3 h-3" /> Đang dùng
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPromptModal(p);
                        }}
                        className="p-1 text-gray-400 hover:text-white transition rounded hover:bg-gray-800"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeletePrompt(p.id, e)}
                        className="p-1 text-gray-400 hover:text-rose-400 transition rounded hover:bg-gray-800"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-gray-300 line-clamp-3 leading-relaxed font-sans">{p.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
