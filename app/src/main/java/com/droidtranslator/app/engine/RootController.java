package com.droidtranslator.app.engine;

import android.os.Process;
import java.io.DataOutputStream;

public class RootController {

    public static boolean isRootAvailable() {
        try {
            java.lang.Process process = Runtime.getRuntime().exec(new String[]{"su", "-c", "id"});
            int exitCode = process.waitFor();
            return exitCode == 0;
        } catch (Exception e) {
            return false;
        }
    }

    public static boolean applyGodModeKernelProtection() {
        try {
            int pid = Process.myPid();
            java.lang.Process process = Runtime.getRuntime().exec("su");
            DataOutputStream os = new DataOutputStream(process.getOutputStream());

            os.writeBytes("echo -1000 > /proc/" + pid + "/oom_score_adj\n");
            os.writeBytes("device_config put activity_manager max_phantom_processes 2147483647\n");
            os.writeBytes("exit\n");
            os.flush();
            return process.waitFor() == 0;
        } catch (Exception e) {
            return false;
        }
    }
}
