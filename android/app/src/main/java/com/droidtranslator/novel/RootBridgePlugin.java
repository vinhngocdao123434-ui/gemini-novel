package com.droidtranslator.novel;

import android.Manifest;
import android.app.Activity;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.PowerManager;
import android.os.Process;
import android.provider.MediaStore;
import android.provider.Settings;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(
    name = "RootBridge",
    permissions = {
        @Permission(
            alias = "storage",
            strings = {
                Manifest.permission.READ_EXTERNAL_STORAGE,
                Manifest.permission.WRITE_EXTERNAL_STORAGE
            }
        )
    }
)
public class RootBridgePlugin extends Plugin {

    private PowerManager.WakeLock wakeLock = null;
    private String pendingExportContent = "";

    private boolean isDeviceRooted() {
        String[] paths = {
            "/system/bin/su",
            "/system/xbin/su",
            "/sbin/su",
            "/system/sd/xbin/su",
            "/system/bin/failsafe/su",
            "/data/local/xbin/su",
            "/data/local/bin/su",
            "/data/local/su",
            "/su/bin/su"
        };
        for (String path : paths) {
            if (new File(path).exists()) return true;
        }
        return false;
    }

    private int getCurrentOomScore() {
        try {
            int pid = Process.myPid();
            File file = new File("/proc/" + pid + "/oom_score_adj");
            if (file.exists() && file.canRead()) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(new java.io.FileInputStream(file)));
                String line = reader.readLine();
                reader.close();
                if (line != null) {
                    return Integer.parseInt(line.trim());
                }
            }
        } catch (Exception ignored) {}
        return 0;
    }

    private boolean executeRootCommands(String[] commands) {
        java.lang.Process process = null;
        DataOutputStream os = null;
        try {
            process = Runtime.getRuntime().exec("su");
            os = new DataOutputStream(process.getOutputStream());
            for (String cmd : commands) {
                os.writeBytes(cmd + "\n");
            }
            os.writeBytes("exit\n");
            os.flush();
            int exitCode = process.waitFor();
            return exitCode == 0;
        } catch (Exception e) {
            return false;
        } finally {
            try {
                if (os != null) os.close();
                if (process != null) process.destroy();
            } catch (Exception ignored) {}
        }
    }

    @PluginMethod
    public void checkRootStatus(PluginCall call) {
        JSObject ret = new JSObject();
        boolean hasBinary = isDeviceRooted();
        int pid = Process.myPid();
        int uid = Process.myUid();
        int oomScore = getCurrentOomScore();

        boolean suGranted = false;
        try {
            java.lang.Process p = Runtime.getRuntime().exec(new String[]{"su", "-c", "id"});
            int code = p.waitFor();
            if (code == 0) {
                suGranted = true;
                hasBinary = true;
            }
        } catch (Exception ignored) {}

        ret.put("isRooted", hasBinary);
        ret.put("hasSuPermission", suGranted);
        ret.put("pid", pid);
        ret.put("uid", uid);
        ret.put("oomScore", oomScore);
        ret.put("isGodModeActive", oomScore <= -900);
        call.resolve(ret);
    }

    @PluginMethod
    public void acquireGodMode(PluginCall call) {
        int pid = Process.myPid();
        int uid = Process.myUid();
        String pkg = getContext().getPackageName();

        String[] cmds = new String[] {
            // 1. Lock OOM Score to -1000 in Linux Kernel (Immune to Low Memory Killer)
            "echo -1000 > /proc/" + pid + "/oom_score_adj",
            // 2. Disable Android 12-16 Phantom Process Killer
            "/system/bin/device_config set_sync_disabled_for_tests persistent",
            "/system/bin/device_config put activity_manager max_phantom_processes 2147483647",
            // 3. Grant full background execution
            "/system/bin/cmd appops set " + pkg + " RUN_IN_BACKGROUND allow",
            // 4. Add to system Doze Mode Whitelist
            "/system/bin/dumpsys deviceidle whitelist +" + pkg,
            // 5. Unrestricted Network Whitelist
            "/system/bin/cmd netpolicy add restrict-background-whitelist " + uid
        };

        boolean ok = executeRootCommands(cmds);
        int finalScore = getCurrentOomScore();

        JSObject ret = new JSObject();
        ret.put("success", ok);
        ret.put("oomScore", finalScore);
        ret.put("isGodModeActive", finalScore <= -900 || ok);
        ret.put("message", ok ? "Kích hoạt God-Mode tầng nhân Linux (OOM -1000) thành công!" : "Không thể lấy quyền root su hoặc thực thi lệnh thất bại.");
        call.resolve(ret);
    }

    @PluginMethod
    public void acquireWakeLock(PluginCall call) {
        try {
            if (wakeLock == null) {
                PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "DroidTranslator:TranslationWakeLock");
                    wakeLock.acquire();
                }
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("isHeld", wakeLock != null && wakeLock.isHeld());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void releaseWakeLock(PluginCall call) {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
                wakeLock = null;
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void requestBatteryOptimizationExemption(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                String packageName = getContext().getPackageName();
                PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
                if (pm != null && !pm.isIgnoringBatteryOptimizations(packageName)) {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + packageName));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(intent);
                }
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    /**
     * Mở màn hình Cài đặt Ứng dụng để người dùng cấp quyền bộ nhớ trực tiếp
     */
    @PluginMethod
    public void openAppSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            Uri uri = Uri.fromParts("package", getContext().getPackageName(), null);
            intent.setData(uri);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Không thể mở Cài đặt: " + e.getMessage());
        }
    }

    /**
     * Yêu cầu cấp quyền "Truy cập tất cả các tệp" (Android 11-16 MANAGE_EXTERNAL_STORAGE)
     */
    @PluginMethod
    public void requestAllFilesAccess(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                if (!Environment.isExternalStorageManager()) {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                    intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(intent);
                }
            } else {
                Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Lỗi mở quyền quản lý tệp: " + e.getMessage());
        }
    }

    /**
     * CHUẨN ANDROID CHÍNH THỨC: Storage Access Framework (SAF)
     * Kích hoạt hộp thoại hệ thống của Android (ACTION_CREATE_DOCUMENT)
     * Cho phép người dùng chọn chính xác thư mục (Download, Documents, Thẻ nhớ SD...) và nhấn LƯU.
     * Hoàn toàn không bao giờ bị lỗi từ chối quyền trên bất kỳ phiên bản Android nào!
     */
    @PluginMethod
    public void exportWithSAF(PluginCall call) {
        String filename = call.getString("filename", "novel_translated.txt");
        String content = call.getString("content", "");
        this.pendingExportContent = content;

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("text/plain");
        intent.putExtra(Intent.EXTRA_TITLE, filename);

        startActivityForResult(call, intent, "safCallback");
    }

    @ActivityCallback
    private void safCallback(PluginCall call, ActivityResult result) {
        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            Uri uri = result.getData().getData();
            if (uri != null) {
                try {
                    OutputStream os = getContext().getContentResolver().openOutputStream(uri);
                    if (os != null) {
                        os.write(pendingExportContent.getBytes(StandardCharsets.UTF_8));
                        os.flush();
                        os.close();
                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        ret.put("uri", uri.toString());
                        ret.put("message", "Đã lưu tệp thành công vào vị trí bạn đã chọn!");
                        call.resolve(ret);
                        return;
                    }
                } catch (Exception e) {
                    call.reject("Lỗi ghi tệp qua SAF: " + e.getMessage());
                    return;
                }
            }
        }
        call.reject("Đã hủy lưu tệp.");
    }

    /**
     * Ghi file trực tiếp vào bộ nhớ Android (/storage/emulated/0/Download/)
     * Sử dụng MediaStore API chuẩn của Android 10-16
     */
    @PluginMethod
    public void saveFileToAndroidStorage(PluginCall call) {
        String filename = call.getString("filename", "novel_translated.txt");
        String content = call.getString("content", "");

        try {
            boolean written = false;
            String savedPath = "";

            // 0. Luôn ghi một bản lưu dự phòng vào Android/data/com.droidtranslator.novel/files/Novels/
            try {
                File extDir = getContext().getExternalFilesDir(null);
                if (extDir != null) {
                    File novelsDir = new File(extDir, "Novels");
                    if (!novelsDir.exists()) novelsDir.mkdirs();
                    File dataFile = new File(novelsDir, filename);
                    FileOutputStream dfos = new FileOutputStream(dataFile);
                    dfos.write(content.getBytes(StandardCharsets.UTF_8));
                    dfos.flush();
                    dfos.close();
                    savedPath = dataFile.getAbsolutePath();
                    written = true;
                }
            } catch (Exception ignored) {}

            // 1. Android 10+ (API 29+): MediaStore Scoped Storage (/storage/emulated/0/Download/)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentResolver resolver = getContext().getContentResolver();
                ContentValues contentValues = new ContentValues();
                contentValues.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                contentValues.put(MediaStore.MediaColumns.MIME_TYPE, "text/plain");
                contentValues.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);

                Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues);
                if (uri != null) {
                    OutputStream os = resolver.openOutputStream(uri);
                    if (os != null) {
                        os.write(content.getBytes(StandardCharsets.UTF_8));
                        os.flush();
                        os.close();
                        written = true;
                        savedPath = "/storage/emulated/0/Download/" + filename;
                    }
                }
            }

            // Quét MediaScanner để file lập tức hiện diện trong các trình quản lý file
            if (written && savedPath != null && !savedPath.isEmpty()) {
                try {
                    android.media.MediaScannerConnection.scanFile(
                        getContext(),
                        new String[]{savedPath},
                        new String[]{"text/plain"},
                        null
                    );
                } catch (Exception ignored) {}
            }

            // 2. Android 9 trở xuống hoặc khi đã có quyền All Files Access
            if (!written) {
                File downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                if (!downloadDir.exists()) {
                    downloadDir.mkdirs();
                }
                File targetFile = new File(downloadDir, filename);
                FileOutputStream fos = new FileOutputStream(targetFile);
                fos.write(content.getBytes(StandardCharsets.UTF_8));
                fos.flush();
                fos.close();
                written = true;
                savedPath = targetFile.getAbsolutePath();
            }

            JSObject ret = new JSObject();
            ret.put("success", written);
            ret.put("path", savedPath);
            ret.put("message", "Đã ghi thành công vào: " + savedPath);
            call.resolve(ret);
        } catch (Exception e) {
            // 3. Fallback bằng quyền Root nếu dính lỗi bảo mật
            if (isDeviceRooted()) {
                try {
                    File tempFile = new File(getContext().getCacheDir(), filename);
                    FileOutputStream fos = new FileOutputStream(tempFile);
                    fos.write(content.getBytes(StandardCharsets.UTF_8));
                    fos.flush();
                    fos.close();

                    String destPath = "/storage/emulated/0/Download/" + filename;
                    String[] cmds = new String[] {
                        "cp " + tempFile.getAbsolutePath() + " " + destPath,
                        "chmod 666 " + destPath,
                        "rm " + tempFile.getAbsolutePath()
                    };
                    boolean ok = executeRootCommands(cmds);
                    if (ok) {
                        JSObject ret = new JSObject();
                        ret.put("success", true);
                        ret.put("path", destPath);
                        ret.put("message", "Đã ghi trực tiếp vào /storage/emulated/0/Download/ bằng quyền Root!");
                        call.resolve(ret);
                        return;
                    }
                } catch (Exception ignored) {}
            }

            call.reject("Lỗi ghi tệp Android: " + e.getMessage());
        }
    }
}
