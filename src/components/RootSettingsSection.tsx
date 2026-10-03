import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Cpu,
  Zap,
  Activity,
  BatteryCharging,
  Wifi,
  RefreshCw,
} from 'lucide-react';
import { RootBridge, RootStatusInfo } from '../utils/rootBridge';

interface RootSettingsSectionProps {
  onAddLog: (msg: string, type?: 'info' | 'success' | 'warning' | 'error' | 'ai') => void;
}

export const RootSettingsSection: React.FC<RootSettingsSectionProps> = ({ onAddLog }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [status, setStatus] = useState<RootStatusInfo>({
    isRooted: false,
    hasSuPermission: false,
    pid: 0,
    uid: 0,
    oomScore: 0,
    isGodModeActive: false,
    phantomProcessesDisabled: false,
    batteryExempted: false,
    wakeLockActive: false,
    environment: 'web-browser',
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load status
  const refreshStatus = async () => {
    setIsLoading(true);
    try {
      const res = await RootBridge.checkStatus();
      setStatus(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleToggleGodMode = async () => {
    setIsLoading(true);
    try {
      if (status.isGodModeActive) {
        localStorage.removeItem('droid_god_mode_sim');
        onAddLog('🛡️ Đã tắt Chế độ Root God-Mode.', 'info');
      } else {
        const res = await RootBridge.acquireGodMode();
        if (res.success) {
          onAddLog(`⚡ [ROOT KERNEL]: ${res.message} (Điểm OOM: ${res.oomScore})`, 'success');
        } else {
          onAddLog(`⚠️ [ROOT KERNEL]: ${res.message}`, 'error');
        }
      }
      await refreshStatus();
    } catch (err: any) {
      onAddLog(`❌ Lỗi khi can thiệp Root: ${err?.message || err}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestBattery = async () => {
    await RootBridge.requestBatteryOptimization();
    onAddLog('🔋 Đã mở yêu cầu Miễn trừ Tối ưu hóa Pin của hệ thống.', 'info');
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden transition-all duration-200">
      {/* Header - Collapsible summary */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3.5 flex items-center justify-between bg-[#161b22] hover:bg-[#1f242c] transition cursor-pointer text-left"
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
              status.isGodModeActive
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm shadow-amber-500/10'
                : 'bg-gray-800 text-gray-400 border border-gray-700'
            }`}
          >
            {status.isGodModeActive ? (
              <Zap className="w-4 h-4 animate-pulse" />
            ) : (
              <ShieldAlert className="w-4 h-4" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-200">
                Chế Độ ROOT &amp; Linux Kernel (God-Mode)
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  status.isGodModeActive
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-gray-800 text-gray-400 border-gray-700'
                }`}
              >
                {status.isGodModeActive ? 'ĐANG BẬT (-1000)' : 'CHƯA BẬT'}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Khóa OOM Score -1000, diệt Phantom Process Killer, bất tử khi tắt màn hình
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-gray-400">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Content */}
      {isOpen && (
        <div className="p-4 border-t border-[#2d333b] bg-[#0d1117] space-y-4 animate-in fade-in duration-150">
          {/* Main Action Banner */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#161b22] border border-[#30363d] gap-3">
            <div>
              <div className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                <span>Trạng thái Superuser:</span>
                <span className={status.isGodModeActive ? 'text-amber-400' : 'text-gray-400'}>
                  {status.isGodModeActive
                    ? 'Đã cấp quyền ROOT (Linux Kernel God-Mode)'
                    : 'Chưa kích hoạt quyền Root'}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {status.environment === 'native-android'
                  ? 'Ứng dụng đang chạy trực tiếp trên thiết bị Android.'
                  : 'Môi trường Web Client. Sẽ tự động gọi su qua Magisk/KernelSU khi cài APK.'}
              </p>
            </div>

            <button
              onClick={handleToggleGodMode}
              disabled={isLoading}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                status.isGodModeActive
                  ? 'bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-500/40'
                  : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-md'
              }`}
            >
              {isLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : status.isGodModeActive ? (
                'Tắt God-Mode'
              ) : (
                '⚡ Kích hoạt ROOT'
              )}
            </button>
          </div>

          {/* 5-Layer Defense Switches & Details */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">
              5 Tầng Bảo Vệ Chạy Ngầm Bất Tử:
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs">
              {/* Layer 1 */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#161b22] border border-[#21262d]">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-gray-200">
                      1. Miễn nhiễm LMK Kill (OOM Score -1000)
                    </div>
                    <div className="text-[10px] text-gray-400">
                      Ghi trực tiếp vào <code className="text-amber-400">/proc/self/oom_score_adj</code>, ngang hàng System Server
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    status.isGodModeActive
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-gray-800 text-gray-500 border-gray-700'
                  }`}
                >
                  {status.isGodModeActive ? 'OOM: -1000' : 'MẶC ĐỊNH'}
                </span>
              </div>

              {/* Layer 2 */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#161b22] border border-[#21262d]">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-blue-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-gray-200">
                      2. Diệt Phantom Process Killer (Android 12-16)
                    </div>
                    <div className="text-[10px] text-gray-400">
                      Nâng giới hạn tiến trình ngầm <code className="text-blue-400">max_phantom_processes</code> lên 2 tỷ
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    status.isGodModeActive
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : 'bg-gray-800 text-gray-500 border-gray-700'
                  }`}
                >
                  {status.isGodModeActive ? 'VÔ HIỆU HÓA' : 'GIỚI HẠN 32'}
                </span>
              </div>

              {/* Layer 3 */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#161b22] border border-[#21262d]">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-gray-200">
                      3. CPU Partial WakeLock (Chống Deep Sleep)
                    </div>
                    <div className="text-[10px] text-gray-400">
                      Giữ nhân CPU luôn thức khi tắt màn hình hoặc đút túi quần
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                  TỰ ĐỘNG BẬT KHI DỊCH
                </span>
              </div>

              {/* Layer 4 */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#161b22] border border-[#21262d]">
                <div className="flex items-center gap-2">
                  <BatteryCharging className="w-4 h-4 text-purple-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-gray-200">
                      4. Miễn trừ Tiết kiệm pin (Doze Mode Whitelist)
                    </div>
                    <div className="text-[10px] text-gray-400">
                      Vượt qua trình dọn dẹp pin của Xiaomi (HyperOS), Samsung (OneUI)
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRequestBattery}
                  className="px-2 py-1 text-[10px] font-bold rounded bg-[#21262d] hover:bg-[#30363d] text-purple-300 border border-purple-500/30 cursor-pointer"
                >
                  Kiểm tra quyền
                </button>
              </div>

              {/* Layer 5 */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#161b22] border border-[#21262d]">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-gray-200">
                      5. Băng thông Mạng ngầm Không giới hạn
                    </div>
                    <div className="text-[10px] text-gray-400">
                      Chính sách <code className="text-cyan-400">netpolicy restrict-background-whitelist</code>
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    status.isGodModeActive
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-gray-800 text-gray-500 border-gray-700'
                  }`}
                >
                  {status.isGodModeActive ? 'UNRESTRICTED' : 'TIÊU CHUẨN'}
                </span>
              </div>
            </div>
          </div>

          {/* Real-time Kernel Diagnostics Mini Console */}
          <div className="p-2.5 rounded-lg bg-[#010409] border border-[#21262d] font-mono text-[11px] space-y-1 text-gray-400">
            <div className="flex items-center justify-between text-gray-300 border-b border-[#21262d] pb-1 font-sans font-bold text-xs">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                Thông số Linux Kernel thực tế:
              </span>
              <button
                type="button"
                onClick={refreshStatus}
                className="text-[10px] text-blue-400 hover:underline flex items-center gap-1 cursor-pointer font-mono"
              >
                <RefreshCw className="w-3 h-3" /> Làm mới
              </button>
            </div>
            <div className="flex justify-between">
              <span>Tiến trình Process ID (PID):</span>
              <span className="text-blue-300 font-bold">{status.pid || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span>Linux oom_score_adj:</span>
              <span
                className={`font-bold ${
                  status.oomScore <= -900 ? 'text-emerald-400' : 'text-gray-300'
                }`}
              >
                {status.oomScore <= -900 ? '-1000 (Miễn nhiễm Kill)' : `${status.oomScore} (Bình thường)`}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Phantom Process Killer:</span>
              <span
                className={`font-bold ${
                  status.isGodModeActive ? 'text-emerald-400' : 'text-yellow-400'
                }`}
              >
                {status.isGodModeActive ? 'ĐÃ VÔ HIỆU HÓA' : 'Đang bật theo hệ điều hành'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
