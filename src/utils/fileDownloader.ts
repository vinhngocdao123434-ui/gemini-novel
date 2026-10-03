/**
/**
 * DroidTranslator Android Native File Export System
 * Chuẩn Native Android sử dụng @capacitor/filesystem và @capacitor/share
 * Tích hợp toàn diện God Mode / Quyền Root Superuser
 */

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { RootBridge } from './rootBridge';

export interface ExportResult {
  success: boolean;
  message: string;
  path?: string;
  shareTriggered?: boolean;
}

/**
 * Xuất file truyện chuẩn Native Android
 * Tự động ghi vào Documents, Android/data và mở Share Sheet hệ thống
 */
export async function exportNovelAndroidNative(
  filename: string,
  content: string
): Promise<ExportResult> {
  const cleanFilename = filename.endsWith('.txt') ? filename : `${filename}.txt`;
  let savedUri = '';
  const successLocations: string[] = [];

  // 1. Tự động xin quyền lưu trữ Android nếu chưa có
  try {
    const permStatus = await Filesystem.checkPermissions();
    if (permStatus.publicStorage !== 'granted') {
      await Filesystem.requestPermissions();
    }
  } catch (permErr) {
    console.warn('Lưu ý kiểm tra quyền bộ nhớ:', permErr);
  }

  // 2. Ghi vào thư mục Documents của Android (/storage/emulated/0/Documents/)
  try {
    const docResult = await Filesystem.writeFile({
      path: cleanFilename,
      data: content,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    savedUri = docResult.uri;
    successLocations.push(`/storage/emulated/0/Documents/${cleanFilename}`);
  } catch (docErr) {
    console.warn('Ghi vào Documents gặp hạn chế, chuyển sang thư mục app:', docErr);
  }

  // 3. Luôn ghi 1 bản vào thư mục riêng của app: /storage/emulated/0/Android/data/com.droidtranslator.novel/files/
  try {
    const dataResult = await Filesystem.writeFile({
      path: cleanFilename,
      data: content,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    if (!savedUri) savedUri = dataResult.uri;
    successLocations.push(`Android/data/.../files/${cleanFilename}`);
  } catch (dataErr) {
    console.warn('Ghi vào Directory.Data:', dataErr);
  }

  // 4. Nếu có quyền Root Superuser (God Mode): Ghi trực tiếp vào /storage/emulated/0/Download/
  try {
    const rootStatus = await RootBridge.checkStatus();
    if (rootStatus.hasSuPermission || rootStatus.isRooted) {
      const rootSave = await RootBridge.saveFileToAndroid(cleanFilename, content);
      if (rootSave.success && rootSave.path) {
        successLocations.push(rootSave.path);
      }
    }
  } catch (rootErr) {
    console.warn('Lỗi ghi file qua Root:', rootErr);
  }

  // 5. Nếu không ở môi trường Capacitor (ví dụ dev preview): Tải trực tiếp qua Web Blob
  if (successLocations.length === 0) {
    try {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = cleanFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return {
        success: true,
        message: `Đã kích hoạt tải ${cleanFilename} về máy!`,
        path: cleanFilename,
      };
    } catch (fallbackErr: any) {
      return {
        success: false,
        message: `Không thể ghi tệp: ${fallbackErr?.message || 'Lỗi không xác định'}`,
      };
    }
  }

  // 6. Kích hoạt Intent Chia Sẻ Hệ Thống Android (Android System Share Sheet)
  let shareOk = false;
  if (savedUri) {
    try {
      await Share.share({
        title: cleanFilename,
        text: `Tác phẩm: ${cleanFilename} (Đã dịch hoàn tất)`,
        url: savedUri,
        dialogTitle: 'Chọn ứng dụng để lưu hoặc mở đọc truyện',
      });
      shareOk = true;
    } catch (shareErr) {
      // Người dùng có thể nhấn nút Quay lại để đóng bảng Share Sheet, không coi là lỗi
      console.log('Share sheet closed:', shareErr);
    }
  }

  return {
    success: true,
    message: `Đã lưu thành công vào máy: ${successLocations.join(' & ')}`,
    path: savedUri || successLocations[0],
    shareTriggered: shareOk,
  };
}

/**
 * Mở bảng chia sẻ hệ thống Android để người dùng chuyển tệp sang app khác (ZArchiver, Drive, Reader)
 */
export async function shareNovelFile(filename: string, content: string): Promise<boolean> {
  try {
    const cleanFilename = filename.endsWith('.txt') ? filename : `${filename}.txt`;
    const tempFile = await Filesystem.writeFile({
      path: cleanFilename,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });

    await Share.share({
      title: cleanFilename,
      url: tempFile.uri,
      dialogTitle: 'Mở hoặc Lưu tệp truyện',
    });
    return true;
  } catch (e) {
    console.warn('Lỗi Share Intent:', e);
    return false;
  }
}
