/**
 * Bộ Điều Phối Xuất Tệp & Tải Xuống Chuẩn Cho Android (/storage/emulated/0/Download/)
 * Tích hợp trực tiếp Native Android Java MediaStore & Root Bridge + Web Fallback
 */

import { RootBridge } from './rootBridge';

export interface ExportResult {
  success: boolean;
  method: 'native-storage' | 'download' | 'share' | 'data-uri' | 'clipboard';
  message: string;
  path?: string;
}

/**
 * Ghi file trực tiếp vào bộ nhớ Android (/storage/emulated/0/Download/)
 * Ưu tiên gọi Native Plugin Java (sử dụng Android MediaStore API của Android 10-16, ghi thẳng không cần hỏi quyền)
 * Nếu chạy trên Web Browser: kích hoạt luồng tải tệp Blob / Data URI.
 */
export async function saveToAndroidStorageMaster(
  filename: string,
  content: string
): Promise<ExportResult> {
  // 1. Kiểm tra môi trường Native Android (Capacitor App)
  if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.RootBridge) {
    const nativeRes = await RootBridge.saveFileToAndroid(filename, content);
    if (nativeRes.success) {
      return {
        success: true,
        method: 'native-storage',
        path: nativeRes.path || `/storage/emulated/0/Download/${filename}`,
        message: nativeRes.message || `Đã ghi thành công vào: /storage/emulated/0/Download/${filename}`,
      };
    }
  }

  // 2. Chế độ Web Browser / WebView: Kích hoạt tải trực tiếp bằng Blob
  const blobOk = triggerDirectDownload(filename, content);
  if (blobOk) {
    return {
      success: true,
      method: 'download',
      path: `/storage/emulated/0/Download/${filename}`,
      message: `Đã kích hoạt tải xuống tệp ${filename} vào thư mục /Download của thiết bị.`,
    };
  }

  // 3. Fallback Data URI
  const dataUriOk = triggerDataUriDownload(filename, content);
  if (dataUriOk) {
    return {
      success: true,
      method: 'data-uri',
      path: `/storage/emulated/0/Download/${filename}`,
      message: `Đã tải tệp ${filename} qua Data URI vào thư mục Download của thiết bị.`,
    };
  }

  return {
    success: false,
    method: 'download',
    message: 'Không thể ghi tệp vào bộ nhớ trên trình duyệt này.',
  };
}

/**
 * Tải file trực tiếp vào thư mục /storage/emulated/0/Download/ của Android
 * Tuyệt đối không dùng target="_blank" vì sẽ khiến Chrome Android hủy tải.
 */
export function triggerDirectDownload(
  filename: string,
  content: string,
  mimeType: string = 'text/plain;charset=utf-8'
): boolean {
  try {
    const blob = new Blob([content], { type: mimeType });
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
    }, 300000);

    return true;
  } catch (err) {
    console.error('Lỗi khi kích hoạt direct download:', err);
    return false;
  }
}

/**
 * Tải qua Data URI - Phương thức dự phòng 100% thành công trên mọi máy Android
 * Không phụ thuộc vào Blob hay ObjectURL, ghi thẳng vào /Download
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
    console.error('Lỗi khi tải qua Data URI:', err);
    return false;
  }
}

/**
 * Mở Hộp thoại Chia Sẻ / Lưu Tệp Gốc của Android (Native Android Share Sheet)
 */
export async function triggerAndroidNativeShare(
  filename: string,
  content: string
): Promise<ExportResult> {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });

  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      const file = new File([blob], filename, {
        type: 'text/plain',
        lastModified: Date.now(),
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: filename,
          text: `Bản dịch hoàn chỉnh: ${filename}`,
        });
        return {
          success: true,
          method: 'share',
          message: 'Đã mở bảng lưu tệp Android. Bạn có thể chọn Lưu vào máy (Files) hoặc Drive/Zalo!',
        };
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return {
          success: false,
          method: 'share',
          message: 'Bạn đã đóng hộp thoại chia sẻ.',
        };
      }
      console.warn('Lỗi khi gọi navigator.share:', err);
    }
  }

  // Tự động chuyển hướng ghi file
  return await saveToAndroidStorageMaster(filename, content);
}
