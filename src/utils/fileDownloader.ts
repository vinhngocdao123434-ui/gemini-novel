/**
 * Bộ Xuất Tệp Chuẩn Cho Android & Web
 * Áp dụng Storage Access Framework (SAF - ACTION_CREATE_DOCUMENT) chuẩn của Android
 */

import { RootBridge } from './rootBridge';

export interface ExportResult {
  success: boolean;
  message: string;
  path?: string;
}

/**
 * Xuất tệp theo chuẩn Android Storage Access Framework (SAF)
 * Mở trình quản lý tệp hệ thống Android để người dùng bấm Lưu vào bất kỳ thư mục nào
 */
export async function exportNovelStandard(
  filename: string,
  content: string
): Promise<ExportResult> {
  // 1. Nếu đang chạy trên ứng dụng Android Native (Capacitor)
  if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.RootBridge) {
    const safRes = await RootBridge.exportWithSAF(filename, content);
    if (safRes.success) {
      return {
        success: true,
        message: safRes.message || 'Đã lưu tệp thành công!',
        path: safRes.uri,
      };
    } else {
      // Nếu người dùng đóng hoặc hủy
      return {
        success: false,
        message: safRes.message || 'Bạn đã hủy lưu tệp.',
      };
    }
  }

  // 2. Nếu đang chạy trên Web Browser: Kích hoạt tải tệp chuẩn trình duyệt
  const blobOk = triggerDirectDownload(filename, content);
  if (blobOk) {
    return {
      success: true,
      message: `Đã kích hoạt tải tệp ${filename} vào thư mục Download của trình duyệt!`,
    };
  }

  const dataUriOk = triggerDataUriDownload(filename, content);
  if (dataUriOk) {
    return {
      success: true,
      message: `Đã tải tệp ${filename} qua Data URI!`,
    };
  }

  return {
    success: false,
    message: 'Không thể kích hoạt tải tệp trên trình duyệt này.',
  };
}

/**
 * Ghi thẳng vào /storage/emulated/0/Download/ không cần mở hộp thoại
 */
export async function saveDirectToDownloadFolder(
  filename: string,
  content: string
): Promise<ExportResult> {
  if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.RootBridge) {
    const res = await RootBridge.saveFileToAndroid(filename, content);
    return {
      success: res.success,
      message: res.message,
      path: res.path,
    };
  }

  const ok = triggerDirectDownload(filename, content);
  return {
    success: ok,
    message: ok ? `Đã gửi lệnh tải ${filename} vào thư mục Download của máy.` : 'Không thể tải tệp.',
  };
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
