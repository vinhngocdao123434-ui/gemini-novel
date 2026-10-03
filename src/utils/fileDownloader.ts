/**
 * Bộ Xuất Tệp Đa Tầng (Multi-Tier Storage Engine) Cho Android Native & Web
 * Tầng 1: Android 10-16 MediaStore API -> Ghi thẳng vào /storage/emulated/0/Download/
 * Tầng 2: Storage Access Framework (SAF - ACTION_CREATE_DOCUMENT)
 * Tầng 3: Capacitor Filesystem (Thư mục Documents/Data của ứng dụng)
 * Tầng 4: Quyền Root (Linux cp) nếu máy đã Root
 * Tầng 5: Trình tải trực tiếp Web Browser
 */

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { RootBridge } from './rootBridge';

export interface ExportResult {
  success: boolean;
  message: string;
  path?: string;
  method?: 'mediastore' | 'saf' | 'filesystem' | 'root' | 'browser';
}

/**
 * Xuất tệp tự động vào thư mục Download của thiết bị (Không cần hỏi người dùng)
 */
export async function saveDirectToDownloadFolder(
  filename: string,
  content: string
): Promise<ExportResult> {
  // 1. Nếu đang chạy trên APK Native Android
  if (RootBridge.isNative()) {
    // 1.1 Thử qua Native RootBridge (MediaStore API + Root fallback)
    try {
      const nativeRes = await RootBridge.saveFileToAndroid(filename, content);
      if (nativeRes.success) {
        return {
          success: true,
          message: nativeRes.message || `Đã ghi thành công tệp vào ${nativeRes.path}`,
          path: nativeRes.path,
          method: 'mediastore',
        };
      }
    } catch (e) {
      console.warn('Native RootBridge saveFileToAndroid error, trying Capacitor Filesystem:', e);
    }

    // 1.2 Thử qua Capacitor Filesystem (Ghi vào thư mục Documents của máy)
    try {
      const fsRes = await Filesystem.writeFile({
        path: filename,
        data: content,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      });
      return {
        success: true,
        message: `Đã lưu tệp vào thư mục Documents của máy: ${filename}`,
        path: fsRes.uri,
        method: 'filesystem',
      };
    } catch (fsErr) {
      console.warn('Capacitor Filesystem write error, trying SAF fallback:', fsErr);
    }

    // 1.3 Mở hộp thoại SAF nếu các cơ chế nền bị hãng điện thoại chặn
    const safRes = await RootBridge.exportWithSAF(filename, content);
    return {
      success: safRes.success,
      message: safRes.message,
      path: safRes.uri,
      method: 'saf',
    };
  }

  // 2. Nếu đang chạy trên Web Browser máy tính hoặc PWA
  const directOk = triggerDirectDownload(filename, content);
  if (directOk) {
    return {
      success: true,
      message: `Đã gửi lệnh tải tệp ${filename} về máy qua trình duyệt!`,
      method: 'browser',
    };
  }

  const dataUriOk = triggerDataUriDownload(filename, content);
  return {
    success: dataUriOk,
    message: dataUriOk
      ? `Đã tải tệp ${filename} qua Data URI!`
      : 'Không thể kích hoạt tải tệp trên trình duyệt này.',
    method: 'browser',
  };
}

/**
 * Xuất tệp theo chuẩn Android Storage Access Framework (SAF)
 * Mở trình quản lý tệp hệ thống Android để người dùng tự chọn thư mục lưu (Thẻ nhớ SD, Download, Documents...)
 */
export async function exportNovelWithSAF(
  filename: string,
  content: string
): Promise<ExportResult> {
  if (RootBridge.isNative()) {
    const safRes = await RootBridge.exportWithSAF(filename, content);
    return {
      success: safRes.success,
      message: safRes.message,
      path: safRes.uri,
      method: 'saf',
    };
  }

  const ok = triggerDirectDownload(filename, content);
  return {
    success: ok,
    message: ok ? `Đã tải tệp ${filename} về máy!` : 'Không thể tải tệp.',
    method: 'browser',
  };
}

/**
 * Hàm xuất chuẩn chung (Mặc định dùng Auto Download, có fallback)
 */
export async function exportNovelStandard(
  filename: string,
  content: string
): Promise<ExportResult> {
  return saveDirectToDownloadFolder(filename, content);
}

/**
 * Mở màn hình Cài đặt cấp quyền Tất Cả Tệp trên Android
 */
export async function openAndroidStorageSettings(): Promise<void> {
  await RootBridge.requestAllFilesAccess();
}

/**
 * Trình tải trực tiếp cho Web Browser
 */
export function triggerDirectDownload(
  filename: string,
  content: string
): boolean {
  try {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';

    document.body.appendChild(a);

    const clickEvent = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
    });
    a.dispatchEvent(clickEvent);

    document.body.removeChild(a);

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 180000);

    return true;
  } catch (err) {
    console.error('Direct download error:', err);
    return false;
  }
}

/**
 * Tải qua Data URI
 */
export function triggerDataUriDownload(
  filename: string,
  content: string
): boolean {
  try {
    const encoded = encodeURIComponent(content);
    const dataUri = `data:text/plain;charset=utf-8,${encoded}`;
    const a = document.createElement('a');
    a.href = dataUri;
    a.download = filename;
    a.style.display = 'none';

    document.body.appendChild(a);

    const clickEvent = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
    });
    a.dispatchEvent(clickEvent);

    document.body.removeChild(a);
    return true;
  } catch (err) {
    console.error('Data URI download error:', err);
    return false;
  }
}
