package com.droidtranslator.novel;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.Settings;
import android.util.Log;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import java.io.File;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "DroidTranslator";
    private static final int STORAGE_PERMISSION_CODE = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RootBridgePlugin.class);
        super.onCreate(savedInstanceState);

        // 1. TẠO NGAY THƯ MỤC HỆ THỐNG /Android/data/com.droidtranslator.novel/
        ensureAndroidDataDirectoriesExist();

        // 2. YÊU CẦU QUYỀN TRUY CẬP BỘ NHỚ HỆ THỐNG
        requestAppStoragePermissions();
    }

    /**
     * Tự động khởi tạo thư mục /Android/data/com.droidtranslator.novel/files/ và /Novels/
     * Đảm bảo xuất hiện ngay lập tức trong trình quản lý tệp của Android
     */
    private void ensureAndroidDataDirectoriesExist() {
        try {
            File extFiles = getExternalFilesDir(null);
            if (extFiles != null) {
                if (!extFiles.exists()) {
                    extFiles.mkdirs();
                }
                File novelsDir = new File(extFiles, "Novels");
                if (!novelsDir.exists()) {
                    novelsDir.mkdirs();
                }
                Log.i(TAG, "Đã khởi tạo thư mục Android/data thành công: " + extFiles.getAbsolutePath());
            }

            File extCache = getExternalCacheDir();
            if (extCache != null && !extCache.exists()) {
                extCache.mkdirs();
            }
        } catch (Exception e) {
            Log.e(TAG, "Lỗi tạo thư mục Android/data: " + e.getMessage());
        }
    }

    /**
     * Yêu cầu quyền truy cập bộ nhớ từ hệ điều hành Android
     */
    public void requestAppStoragePermissions() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                // Android 11 đến 16 (API 30+): Xin quyền All Files Access (MANAGE_EXTERNAL_STORAGE)
                if (!Environment.isExternalStorageManager()) {
                    try {
                        Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                        intent.setData(Uri.parse("package:" + getPackageName()));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                    } catch (Exception e) {
                        Intent intent = new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                    }
                }
            } else {
                // Android 6 đến 10: Xin quyền READ/WRITE_EXTERNAL_STORAGE truyền thống
                if (ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions(
                        this,
                        new String[]{
                            Manifest.permission.READ_EXTERNAL_STORAGE,
                            Manifest.permission.WRITE_EXTERNAL_STORAGE
                        },
                        STORAGE_PERMISSION_CODE
                    );
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Lỗi xin quyền bộ nhớ: " + e.getMessage());
        }
    }
}
