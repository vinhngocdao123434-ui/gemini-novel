/**
 * DroidTranslator Root & Kernel God-Mode Bridge
 * Kết nối giữa Web Client và Nhân Linux / Quyền Superuser Android
 */

import { Capacitor, registerPlugin } from '@capacitor/core';

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

export interface RootBridgeNativePlugin {
  checkRootStatus: () => Promise<any>;
  acquireGodMode: () => Promise<any>;
  acquireWakeLock: () => Promise<any>;
  releaseWakeLock: () => Promise<any>;
  requestBatteryOptimizationExemption: () => Promise<any>;
  saveFileToAndroidStorage: (options: { filename: string; content: string }) => Promise<{ success: boolean; path?: string; message: string }>;
  exportWithSAF: (options: { filename: string; content: string }) => Promise<{ success: boolean; uri?: string; message: string }>;
  openAppSettings: () => Promise<any>;
  requestAllFilesAccess: () => Promise<any>;
}

export const NativeRootBridge = registerPlugin<RootBridgeNativePlugin>('RootBridge');

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      Plugins?: {
        RootBridge?: RootBridgeNativePlugin;
      };
    };
  }
}

let browserWakeLockSentinel: any = null;

const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform() || !!window.Capacitor?.Plugins?.RootBridge;
};

export const RootBridge = {
  /**
   * Kiểm tra xem đang chạy trong môi trường Native Android hay Web
   */
  isNative(): boolean {
    return isNativePlatform();
  },

  /**
   * Kiểm tra trạng thái Quyền Root và Thông số Kernel
   */
  async checkStatus(): Promise<RootStatusInfo> {
    if (isNativePlatform()) {
      try {
        const res = await NativeRootBridge.checkRootStatus();
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
        console.warn('RootBridge checkStatus failed on native, falling back to simulated info:', e);
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
    if (isNativePlatform()) {
      try {
        const res = await NativeRootBridge.acquireGodMode();
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
    if (isNativePlatform()) {
      try {
        await NativeRootBridge.acquireWakeLock();
        return true;
      } catch (e) {
        console.warn('Native acquireWakeLock error:', e);
      }
    }

    // Web Screen Wake Lock API
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
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
    if (isNativePlatform()) {
      try {
        await NativeRootBridge.releaseWakeLock();
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
    if (isNativePlatform()) {
      try {
        await NativeRootBridge.requestBatteryOptimizationExemption();
      } catch (e) {
        console.warn('Battery optimization request failed:', e);
      }
    } else {
      console.info('Trên Android, tính năng này sẽ mở hộp thoại cấp quyền Miễn trừ Tối ưu Pin của hệ điều hành.');
    }
  },

  /**
   * Ghi file trực tiếp vào bộ nhớ Android (/storage/emulated/0/Download/) qua Native Java Plugin
   */
  async saveFileToAndroid(filename: string, content: string): Promise<{ success: boolean; path?: string; message: string }> {
    if (isNativePlatform()) {
      try {
        const res = await NativeRootBridge.saveFileToAndroidStorage({ filename, content });
        return {
          success: !!res.success,
          path: res.path,
          message: res.message || `Đã lưu tệp vào ${res.path}`,
        };
      } catch (e: any) {
        return {
          success: false,
          message: e?.message || 'Lỗi từ Native Plugin khi ghi bộ nhớ Android.',
        };
      }
    }

    return {
      success: false,
      message: 'Không phát hiện Native Capacitor Bridge (đang chạy trên Web Browser).',
    };
  },

  /**
   * Lưu tệp bằng Trình Quản Lý Tệp Chuẩn của Android (SAF - Intent.ACTION_CREATE_DOCUMENT)
   */
  async exportWithSAF(filename: string, content: string): Promise<{ success: boolean; uri?: string; message: string }> {
    if (isNativePlatform()) {
      try {
        const res = await NativeRootBridge.exportWithSAF({ filename, content });
        return {
          success: !!res.success,
          uri: res.uri,
          message: res.message || 'Đã lưu tệp thành công!',
        };
      } catch (e: any) {
        return {
          success: false,
          message: e?.message || 'Đã hủy lưu tệp.',
        };
      }
    }

    return {
      success: false,
      message: 'Không phát hiện Native Capacitor Bridge.',
    };
  },

  /**
   * Mở màn hình Cài đặt Ứng dụng Android (App Info Settings)
   */
  async openAppSettings(): Promise<void> {
    if (isNativePlatform()) {
      try {
        await NativeRootBridge.openAppSettings();
      } catch (e) {
        console.warn('Cannot open app settings:', e);
      }
    }
  },

  /**
   * Mở màn hình cấp quyền Quyền Quản Lý Tất Cả Tệp (MANAGE_EXTERNAL_STORAGE)
   */
  async requestAllFilesAccess(): Promise<void> {
    if (isNativePlatform()) {
      try {
        await NativeRootBridge.requestAllFilesAccess();
      } catch (e) {
        console.warn('Cannot request all files access:', e);
      }
    }
  },
};
