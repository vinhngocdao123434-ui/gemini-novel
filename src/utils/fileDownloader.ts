/**
 * Bộ điều phối Xuất File & Tải Tệp Tương Thích Hoàn Hảo Với Android & Trình Duyệt Mobile
 * Khắc phục hoàn toàn lỗi thu hồi URL Blob sớm khiến thư mục /Download của Android bị trống.
 */

export interface ExportResult {
  success: boolean;
  method: 'download' | 'share' | 'file-picker' | 'clipboard';
  message: string;
}

/**
 * Tải file trực tiếp vào thư mục /Download của máy
 * Duy trì ObjectURL trong 3 phút, tuyệt đối không revoke sớm để Android Download Manager hoàn tất ghi file.
 */
export function triggerDirectDownload(filename: string, content: string | Blob, mimeType: string = 'text/plain;charset=utf-8'): boolean {
  try {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.target = '_blank';
    a.style.display = 'none';

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // QUAN TRỌNG: Không bao giờ revoke ngay lập tức!
    // Trình quản lý tải xuống của Android (Android Download Manager) cần từ 15-60s để đọc xong blob stream.
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 180000); // 3 phút

    return true;
  } catch (err) {
    console.error('Lỗi khi kích hoạt download:', err);
    return false;
  }
}

/**
 * Lưu file trực tiếp vào Bộ nhớ máy thông qua Bộ chọn Tệp Android (Native Android Share / Save to Files)
 * Mở hộp thoại hệ thống của Android cho phép người dùng chọn chính xác thư mục (Download, Tài liệu, Thẻ nhớ, Drive...)
 */
export async function saveToDeviceStorageNative(
  filename: string,
  content: string,
  mimeType: string = 'text/plain;charset=utf-8'
): Promise<ExportResult> {
  const blob = new Blob([content], { type: mimeType });

  // Cách 1: Sử dụng Web Share API của Android (Chuẩn Native Android nhất)
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      const file = new File([blob], filename, { type: mimeType, lastModified: Date.now() });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: filename,
          text: `Xuất tệp truyện: ${filename}`,
          files: [file],
        });
        return {
          success: true,
          method: 'share',
          message: 'Đã mở hộp thoại lưu tệp Android. Bạn có thể chọn Lưu vào máy hoặc Drive!',
        };
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return {
          success: false,
          method: 'share',
          message: 'Người dùng đã hủy lưu tệp.',
        };
      }
      console.warn('Web Share API không khả dụng hoặc bị từ chối, chuyển sang phương thức tải trực tiếp...', err);
    }
  }

  // Cách 2: File System Access API (trên Chromium / Android hiện đại)
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as unknown as {
        showSaveFilePicker: (options: { suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }) => Promise<{ createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }> }>;
      }).showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'Văn bản Text (.txt)',
            accept: { 'text/plain': ['.txt'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return {
        success: true,
        method: 'file-picker',
        message: `Đã lưu tệp ${filename} trực tiếp vào thư mục đã chọn trên máy!`,
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return {
          success: false,
          method: 'file-picker',
          message: 'Người dùng đã hủy chọn thư mục.',
        };
      }
      console.warn('showSaveFilePicker thất bại, chuyển sang phương thức tải trực tiếp...', err);
    }
  }

  // Cách 3: Fallback tải trực tiếp
  const downloaded = triggerDirectDownload(filename, blob, mimeType);
  if (downloaded) {
    return {
      success: true,
      method: 'download',
      message: `Đang gửi lệnh tải tệp ${filename} vào thư mục /Download của máy...`,
    };
  }

  return {
    success: false,
    method: 'download',
    message: 'Không thể xuất tệp trên trình duyệt hiện tại.',
  };
}
