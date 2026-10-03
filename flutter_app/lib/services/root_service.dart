import 'dart:io';
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

class RootService {
  /// Kiểm tra thiết bị có quyền Root không
  static Future<bool> isDeviceRooted() async {
    final suPaths = [
      '/system/bin/su',
      '/system/xbin/su',
      '/sbin/su',
      '/system/sd/xbin/su',
      '/data/local/xbin/su',
      '/data/local/bin/su',
      '/data/local/su',
      '/su/bin/su',
    ];
    for (final path in suPaths) {
      if (await File(path).exists()) return true;
    }

    try {
      final res = await Process.run('which', ['su']);
      return res.exitCode == 0;
    } catch (_) {
      return false;
    }
  }

  /// Kích hoạt Linux Kernel God-Mode (OOM -1000, Tắt Phantom Killer)
  static Future<Map<String, dynamic>> acquireGodMode() async {
    final pid = pid;
    final commands = [
      // 1. OOM Score -1000: Bất tử trước LMK của Android
      'echo -1000 > /proc/$pid/oom_score_adj',
      // 2. Tắt Phantom Process Killer trên Android 12-16
      '/system/bin/device_config set_sync_disabled_for_tests persistent',
      '/system/bin/device_config put activity_manager max_phantom_processes 2147483647',
      'setprop persist.sys.fflag.override.settings_enable_monitor_phantom_procs false',
      // 3. Cho phép chạy ngầm không giới hạn
      'cmd appops set com.droidtranslator.novel RUN_IN_BACKGROUND allow',
      'cmd appops set com.droidtranslator.novel RUN_ANY_IN_BACKGROUND allow',
    ];

    try {
      final script = commands.join(' && ');
      final res = await Process.run('su', ['-c', script]);
      if (res.exitCode == 0) {
        return {
          'success': true,
          'message': 'Đã kích hoạt chế độ Root God-Mode (OOM Score: -1000, Phantom Killer: TẮT).',
          'oomScore': -1000,
        };
      }
    } catch (e) {
      // Ignored
    }

    return {
      'success': false,
      'message': 'Không thể cấp quyền Root. Đang chạy ở chế độ tiêu chuẩn.',
      'oomScore': 0,
    };
  }

  /// Khởi động Foreground Service để treo dịch 24/24 trên thanh thông báo
  static Future<void> startForegroundTask() async {
    await FlutterForegroundTask.init(
      androidNotificationOptions: AndroidNotificationOptions(
        channelId: 'droid_translation_service',
        channelName: 'DroidTranslator Background Service',
        channelDescription: 'Duy trì tiến trình dịch tiểu thuyết chạy ngầm 24/24',
        channelImportance: NotificationChannelImportance.LOW,
        priority: NotificationPriority.LOW,
        iconData: const NotificationIconData(
          resType: ResourceType.mipmap,
          resPrefix: ResourcePrefix.ic,
          name: 'launcher',
        ),
      ),
      iosNotificationOptions: const IOSNotificationOptions(),
      foregroundTaskOptions: const ForegroundTaskOptions(
        interval: 5000,
        isOnceEvent: false,
        autoRunOnBoot: false,
        allowWakeLock: true,
        allowWifiLock: true,
      ),
    );

    if (await FlutterForegroundTask.isRunningService) {
      await FlutterForegroundTask.restartService();
    } else {
      await FlutterForegroundTask.startService(
        notificationTitle: 'DroidTranslator đang dịch ngầm',
        notificationText: 'Hệ thống đang hoạt động liên tục không bị gián đoạn...',
      );
    }

    // Khóa CPU luôn thức
    await WakelockPlus.enable();
  }

  /// Dừng Foreground Service và giải phóng WakeLock
  static Future<void> stopForegroundTask() async {
    await FlutterForegroundTask.stopService();
    await WakelockPlus.disable();
  }
}
