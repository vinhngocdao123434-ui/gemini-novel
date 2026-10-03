package com.droidtranslator.novel;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.os.Process;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.File;
import java.io.InputStreamReader;

@CapacitorPlugin(name = "RootBridge")
public class RootBridgePlugin extends Plugin {

    private PowerManager.WakeLock wakeLock = null;

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
}
