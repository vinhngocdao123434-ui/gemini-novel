/**
 * DroidTranslator Root & Kernel God-Mode Bridge
 * Kết nối giữa Web Client và Nhân Linux / Quyền Superuser Android
 */

export interface RootStatusInfo {
  isRooted: boolean;
  hasSuPermission: boolean;
  pid: number;
  uid: number;
  oomScore: number;
  isGodModeActive: boolean;
  phantomProcessesDisabled: boolean;
  batteryExempted: boolean;
  wakeLockActive: boolean;
  environment: 'native-android' | 'web-browser';
}

declare global {
  interface Window {
    Capacitor?: {
      Plugins?: {
        RootBridge?: {
          checkRootStatus: () => Promise<any>;
          acquireGodMode: () => Promise<any>;
          acquireWakeLock: () => Promise<any>;
          releaseWakeLock: () => Promise<any>;
          requestBatteryOptimizationExemption: () => Promise<any>;
        };
      };
    };
  }
}

let browserWakeLockSentinel: any = null;

export const RootBridge = {
  /**
   * Kiểm tra trạng thái Quyền Root và Thông số Kernel
   */
  async checkStatus(): Promise<RootStatusInfo> {
    const plugin = window.Capacitor?.Plugins?.RootBridge;
    if (plugin) {
      try {
        const res = await plugin.checkRootStatus();
        return {
          isRooted: !!res.isRooted,
          hasSuPermission: !!res.hasSuPermission,
          pid: res.pid || 0,
          uid: res.uid || 0,
          oomScore: typeof res.oomScore === 'number' ? res.oomScore : 0,
          isGodModeActive: !!res.isGodModeActive,
          phantomProcessesDisabled: res.oomScore <= -900,
          batteryExempted: true,
          wakeLockActive: false,
          environment: 'native-android',
        };
      } catch (e) {
        console.warn('RootBridge checkStatus failed:', e);
      }
    }

    // Chế độ mô phỏng khi chạy trên trình duyệt Web
    const savedGodMode = localStorage.getItem('droid_god_mode_sim') === 'true';
    return {
      isRooted: savedGodMode,
      hasSuPermission: savedGodMode,
      pid: 24891,
      uid: 10188,
      oomScore: savedGodMode ? -1000 : 200,
      isGodModeActive: savedGodMode,
      phantomProcessesDisabled: savedGodMode,
      batteryExempted: savedGodMode,
      wakeLockActive: !!browserWakeLockSentinel,
      environment: 'web-browser',
    };
  },

  /**
   * Kích hoạt Quyền Root & Linux Kernel God-Mode (OOM -1000, Tắt Phantom Killer)
   */
  async acquireGodMode(): Promise<{ success: boolean; message: string; oomScore: number }> {
    const plugin = window.Capacitor?.Plugins?.RootBridge;
    if (plugin) {
      try {
        const res = await plugin.acquireGodMode();
        return {
          success: !!res.success,
          message: res.message || 'Đã áp dụng các quy tắc Linux Kernel.',
          oomScore: typeof res.oomScore === 'number' ? res.oomScore : -1000,
        };
      } catch (e: any) {
        return {
          success: false,
          message: e?.message || 'Không thể gọi lệnh Root từ Native Plugin.',
          oomScore: 0,
        };
      }
    }

    // Mô phỏng trên web
    localStorage.setItem('droid_god_mode_sim', 'true');
    return {
      success: true,
      message: 'Đã kích hoạt chế độ Root (Mô phỏng Web - Trên Android APK sẽ tự động xin quyền Magisk/KernelSU).',
      oomScore: -1000,
    };
  },

  /**
   * Khóa CPU luôn thức (WakeLock) chống Deep Sleep khi tắt màn hình
   */
  async acquireWakeLock(): Promise<boolean> {
    const plugin = window.Capacitor?.Plugins?.RootBridge;
    if (plugin) {
      try {
        await plugin.acquireWakeLock();
        return true;
      } catch (e) {
        console.warn('Native acquireWakeLock error:', e);
      }
    }

    // Web Screen Wake Lock API
    if ('wakeLock' in navigator) {
      try {
        browserWakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        return true;
      } catch (e) {
        console.warn('Browser wakeLock error:', e);
      }
    }
    return false;
  },

  /**
   * Giải phóng WakeLock
   */
  async releaseWakeLock(): Promise<void> {
    const plugin = window.Capacitor?.Plugins?.RootBridge;
    if (plugin) {
      try {
        await plugin.releaseWakeLock();
      } catch (e) {
        console.warn('Native releaseWakeLock error:', e);
      }
    }

    if (browserWakeLockSentinel) {
      try {
        await browserWakeLockSentinel.release();
        browserWakeLockSentinel = null;
      } catch (e) {
        console.warn('Browser releaseWakeLock error:', e);
      }
    }
  },

  /**
   * Yêu cầu miễn trừ tối ưu hóa pin hệ thống (Doze Mode Whitelist)
   */
  async requestBatteryOptimization(): Promise<void> {
    const plugin = window.Capacitor?.Plugins?.RootBridge;
    if (plugin) {
      try {
        await plugin.requestBatteryOptimizationExemption();
      } catch (e) {
        console.warn('Battery optimization request failed:', e);
      }
    } else {
      alert('Trên Android, tính năng này sẽ mở hộp thoại cấp quyền Miễn trừ Tối ưu Pin của hệ điều hành.');
    }
  },
};
