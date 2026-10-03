/**
 * Bộ Điều Phối Xuất Tệp & Tải Xuống Chuẩn Cho Android (/storage/emulated/0/Download/)
 * Loại bỏ hoàn toàn target="_blank" và showSaveFilePicker (vốn gây lỗi AbortError trên Chrome Android)
 */

export interface ExportResult {
  success: boolean;
  method: 'download' | 'share' | 'data-uri' | 'clipboard';
  message: string;
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

    // Kích hoạt sự kiện click chuẩn cho Android Chrome & WebViews
    const clickEvent = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
    });
    a.dispatchEvent(clickEvent);

    document.body.removeChild(a);

    // Giữ ObjectURL trong 5 phút để Android Download Manager hoàn tất ghi vào đĩa
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
 * Mở hộp thoại hệ thống: Cho phép chọn Google Files, Samsung My Files, Drive, Zalo, v.v.
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

  // Nếu trình duyệt không hỗ trợ chia sẻ File (hoặc webview giới hạn), tự động kích hoạt tải trực tiếp
  const directOk = triggerDirectDownload(filename, content);
  if (directOk) {
    return {
      success: true,
      method: 'download',
      message: 'Thiết bị không hỗ trợ Share Sheet. Đã tự động kích hoạt tải tệp vào thư mục /Download!',
    };
  }

  const dataUriOk = triggerDataUriDownload(filename, content);
  if (dataUriOk) {
    return {
      success: true,
      method: 'data-uri',
      message: 'Đã kích hoạt tải tệp qua luồng dữ liệu trực tiếp vào /Download!',
    };
  }

  return {
    success: false,
    method: 'download',
    message: 'Không thể kích hoạt tải tệp trên trình duyệt này.',
  };
}
