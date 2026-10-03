import 'dart:io';
import 'dart:convert';
import 'package:path_provider/path_provider.dart';
import 'package:file_picker/file_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/app_models.dart';

class StorageService {
  static const String _settingsKey = 'droid_app_settings';
  static const String _keysKey = 'droid_api_keys';
  static const String _promptsKey = 'droid_prompt_cards';
  static const String _projectPrefix = 'droid_project_';

  /// Yêu cầu cấp quyền bộ nhớ trực tiếp trên Android
  static Future<bool> requestStoragePermissions() async {
    if (!Platform.isAndroid) return true;

    // Android 11+ (API 30+): Xin quyền All Files Access
    if (await Permission.manageExternalStorage.isGranted) {
      return true;
    }

    final manageStatus = await Permission.manageExternalStorage.request();
    if (manageStatus.isGranted) return true;

    // Android 10 trở xuống
    final storageStatus = await Permission.storage.request();
    return storageStatus.isGranted;
  }

  /// Tự động khởi tạo thư mục /Android/data/com.droidtranslator.novel/files/Novels/
  static Future<Directory?> ensureAndroidDataNovelsDir() async {
    try {
      final extDir = await getExternalStorageDirectory();
      if (extDir != null) {
        final novelsDir = Directory('${extDir.path}/Novels');
        if (!await novelsDir.exists()) {
          await novelsDir.create(recursive: true);
        }
        return novelsDir;
      }
    } catch (e) {
      // Ignored
    }
    return null;
  }

  /// Xuất tệp trực tiếp vào thư mục /storage/emulated/0/Download/
  static Future<Map<String, dynamic>> saveDirectToDownloadFolder(String filename, String content) async {
    try {
      // 1. Luôn lưu 1 bản vào Android/data/com.droidtranslator.novel/files/Novels/
      final novelsDir = await ensureAndroidDataNovelsDir();
      if (novelsDir != null) {
        final internalFile = File('${novelsDir.path}/$filename');
        await internalFile.writeAsString(content, encoding: utf8);
      }

      // 2. Thử ghi trực tiếp vào /storage/emulated/0/Download/
      final downloadDir = Directory('/storage/emulated/0/Download');
      if (await downloadDir.exists()) {
        final targetFile = File('${downloadDir.path}/$filename');
        await targetFile.writeAsString(content, encoding: utf8);
        return {
          'success': true,
          'path': targetFile.path,
          'message': 'Đã ghi thành công tệp vào: ${targetFile.path}',
        };
      }

      // 3. Fallback bằng getDownloadsDirectory của path_provider
      final sysDownloads = await getDownloadsDirectory();
      if (sysDownloads != null) {
        final targetFile = File('${sysDownloads.path}/$filename');
        await targetFile.writeAsString(content, encoding: utf8);
        return {
          'success': true,
          'path': targetFile.path,
          'message': 'Đã ghi thành công tệp vào: ${targetFile.path}',
        };
      }
    } catch (e) {
      // 4. Fallback bằng quyền Root nếu máy đã Root
      final rootRes = await saveWithRoot(filename, content);
      if (rootRes['success'] == true) {
        return rootRes;
      }
    }

    return {
      'success': false,
      'message': 'Không thể ghi trực tiếp. Hãy chọn lưu qua hộp thoại SAF bên dưới!',
    };
  }

  /// Mở hộp thoại Storage Access Framework (SAF) để người dùng chọn nơi lưu tùy ý
  static Future<Map<String, dynamic>> exportWithSAF(String filename, String content) async {
    try {
      final bytes = utf8.encode(content);
      final outputFile = await FilePicker.platform.saveFile(
        dialogTitle: 'Chọn nơi lưu tệp tiểu thuyết đã dịch:',
        fileName: filename,
        type: FileType.custom,
        allowedExtensions: ['txt'],
        bytes: bytes,
      );

      if (outputFile != null) {
        return {
          'success': true,
          'path': outputFile,
          'message': 'Đã lưu tệp thành công vào: $outputFile',
        };
      } else {
        return {
          'success': false,
          'message': 'Bạn đã hủy hộp thoại lưu tệp.',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Lỗi lưu tệp qua SAF: $e',
      };
    }
  }

  /// Ghi file vào /storage/emulated/0/Download bằng quyền Root
  static Future<Map<String, dynamic>> saveWithRoot(String filename, String content) async {
    try {
      final tempDir = await getTemporaryDirectory();
      final tempFile = File('${tempDir.path}/$filename');
      await tempFile.writeAsString(content, encoding: utf8);

      final destPath = '/storage/emulated/0/Download/$filename';
      final res = await Process.run('su', [
        '-c',
        'cp "${tempFile.path}" "$destPath" && chmod 666 "$destPath" && rm "${tempFile.path}"'
      ]);

      if (res.exitCode == 0) {
        return {
          'success': true,
          'path': destPath,
          'message': 'Đã ghi trực tiếp vào $destPath bằng quyền Root!',
        };
      }
    } catch (e) {
      // Ignored
    }
    return {
      'success': false,
      'message': 'Không thể ghi bằng quyền Root.',
    };
  }

  // --- SharedPreferences persistence ---
  static Future<void> saveProject(ProjectData data) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('$_projectPrefix${data.projectName}', jsonEncode(data.toJson()));
  }

  static Future<ProjectData> loadProject(String projectName) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('$_projectPrefix$projectName');
    if (raw != null) {
      try {
        return ProjectData.fromJson(jsonDecode(raw));
      } catch (_) {}
    }
    return ProjectData(projectName: projectName);
  }
}
