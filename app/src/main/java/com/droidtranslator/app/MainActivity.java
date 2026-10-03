package com.droidtranslator.app;

import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.*;
import androidx.appcompat.app.AppCompatActivity;
import com.droidtranslator.app.engine.RootController;
import com.droidtranslator.app.model.ApiKeyItem;
import com.droidtranslator.app.model.PromptCardItem;
import com.droidtranslator.app.service.TranslationForegroundService;
import com.google.android.material.tabs.TabLayout;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import android.content.SharedPreferences;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.*;

public class MainActivity extends AppCompatActivity {

    private static final int REQUEST_PICK_FILE = 1001;
    private static final int REQUEST_PICK_GLOSSARY_FILE = 1002;

    // Root FrameLayout chứa toàn bộ giao diện và Reader Overlay toàn màn hình
    private FrameLayout rootFrame;
    private LinearLayout mainContentLayout;

    // 4 Tab Views theo đúng thứ tự người dùng yêu cầu:
    // Tab 1: Key & Prompt
    // Tab 2: Dịch & Từ điển (Glossary)
    // Tab 3: Bản dịch & Đọc AMOLED/Sepia
    // Tab 4: Cài đặt & Trạng thái 5 tầng God-Mode
    private TabLayout tabLayout;
    private FrameLayout containerLayout;
    private ScrollView tabKeysView;
    private ScrollView tabTranslateView;
    private ScrollView tabReaderView;
    private ScrollView tabSettingsView;

    // Tab 4: Cài đặt chuyên sâu UI
    private TextView tvSettingsProjName;
    private TextView tvSettingsProjStats;
    private TextView tvSettingsMinTerm;
    private TextView tvSettingsMinFreq;
    private EditText edtCustomMinTerm;
    private EditText edtCustomMinFreq;
    private TextView tvSettingsTargetLang;
    private Button btnLangVi;
    private Button btnLangJa;
    private Button btnLangEn;
    private Button btnLangKo;
    private Button btnSettingsAntiHanzi;
    private Button btnSettingsPolicy;
    private final List<Button> minTermButtons = new ArrayList<>();
    private final List<Button> minFreqButtons = new ArrayList<>();

    // Quản lý Đa Dự Án (Multi-Project)
    private String currentProjectName = "Dai_Quan_Gia_Ma_Hoang";
    private final List<String> projectList = new ArrayList<>();
    private TextView tvCurrentProjectName;

    // Trạng thái ứng dụng
    private final List<ApiKeyItem> apiKeys = new ArrayList<>();
    private final Map<String, String> masterGlossary = new LinkedHashMap<>();
    private final List<PromptCardItem> promptCards = new ArrayList<>();
    private final List<String> rawChapters = new ArrayList<>();
    private final Map<Integer, String> translatedChapters = new HashMap<>();

    // Cài Đặt Chuyên Sâu (Deep Settings Hub)
    private int minTermLength = 2;
    private int minFrequency = 2;
    private String conflictPolicy = "keep-old";
    private boolean antiHanziStrict = true;
    private String targetLanguage = "Tiếng Việt";
    private int cooldownSeconds = 60;
    private String rotationStrategy = "round-robin";
    private int contextSnippetLength = 350;

    private String currentModel = "gemini-2.5-flash";
    private boolean isTranslating = false;
    private boolean isPaused = false;
    private int currentChapterIdx = 0;
    private int rangeFromChap = 1;
    private int rangeToChap = 1;
    private int delaySec = 2;
    private String loadedRawContent = "";
    private final LinkedList<String> logList = new LinkedList<>();
    private int chapterListPage = 0;
    private static final int CHAPTERS_PER_PAGE = 100;
    private GeminiEngine engine;
    private Handler mainHandler;
    private final Gson gson = new Gson();

    // Tab 1: Key & Prompt UI
    private LinearLayout llKeyList;
    private EditText edtNewKey;
    private TextView tvSelectedModel;
    private LinearLayout llPromptCards;

    // Tab 2: Dịch & Glossary UI
    private ProgressBar progressBar;
    private TextView tvProgressText;
    private EditText edtFromChap;
    private EditText edtToChap;
    private Button btnStartRange;
    private Button btnPauseResume;
    private Button btnCancelTrans;
    private EditText edtRawText;
    private EditText edtChunkSize;
    private TextView tvGlossaryHeader;
    private LinearLayout llGlossaryList;
    private EditText edtGlossaryKey;
    private EditText edtGlossaryVal;
    private TextView tvLiveLogs;

    // Tab 3: Bản dịch & Đọc UI
    private LinearLayout llChapterList;
    private TextView tvChapterCountInfo;

    // =========================================================================
    // TRÌNH ĐỌC TOÀN MÀN HÌNH CHUYÊN NGHIỆP (AMOLED & SEPIA & SÁNG)
    // =========================================================================
    private FrameLayout flReaderOverlay;
    private LinearLayout llReaderRoot;
    private TextView tvReaderTitle;
    private TextView tvReaderSubTitle;
    private TextView tvReaderContent;
    private ScrollView svReaderScroll;
    private int readerCurrentChapterIndex = 0;
    private int readerFontSize = 16;
    private String readerTheme = "amoled"; // "amoled", "sepia", "light"
    private String readerMode = "translated"; // "translated", "bilingual", "original"
    private Button btnModeTrans;
    private Button btnModeBilingual;
    private Button btnModeRaw;
    private Button btnThemeAmoled;
    private Button btnThemeSepia;
    private Button btnThemeLight;
    private TextView tvFontSizeDisplay;
    private Button btnPrevChapter;
    private Button btnNextChapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        mainHandler = new Handler(Looper.getMainLooper());

        // Kích hoạt bảo vệ Root nếu có
        if (RootController.isRootAvailable()) {
            RootController.applyGodModeKernelProtection();
        }

        loadAllState();
        engine = new GeminiEngine(apiKeys);
        initUI();
    }

    @Override
    protected void onPause() {
        super.onPause();
        saveAllState();
    }

    @Override
    protected void onStop() {
        super.onStop();
        saveAllState();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        saveAllState();
    }

    private void saveAllState() {
        try {
            SharedPreferences sp = getSharedPreferences("droid_prefs", Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = sp.edit();
            editor.putString("current_project_name", currentProjectName);
            editor.putString("current_model", currentModel);
            editor.putInt("delay_sec", delaySec);
            editor.putString("project_list", gson.toJson(projectList));
            editor.putString("api_keys", gson.toJson(apiKeys));
            editor.putString("prompt_cards", gson.toJson(promptCards));

            // Lưu cấu hình Cài Đặt Chuyên Sâu
            editor.putInt("min_term_length", minTermLength);
            editor.putInt("min_frequency", minFrequency);
            editor.putString("conflict_policy", conflictPolicy);
            editor.putBoolean("anti_hanzi_strict", antiHanziStrict);
            editor.putString("target_language", targetLanguage);
            editor.putInt("cooldown_seconds", cooldownSeconds);
            editor.putString("rotation_strategy", rotationStrategy);
            editor.putInt("context_snippet_len", contextSnippetLength);

            editor.apply();

            saveCurrentProjectData();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void saveCurrentProjectData() {
        try {
            if (currentProjectName == null || currentProjectName.trim().isEmpty()) return;
            java.io.File projectDir = new java.io.File(getFilesDir(), "projects");
            if (!projectDir.exists()) projectDir.mkdirs();

            java.io.File pFile = new java.io.File(projectDir, currentProjectName + ".json");
            JsonObject obj = new JsonObject();
            obj.addProperty("projectName", currentProjectName);
            obj.addProperty("currentChapterIdx", currentChapterIdx);
            obj.addProperty("loadedRawContent", loadedRawContent != null ? loadedRawContent : "");

            JsonArray rawArr = new JsonArray();
            for (String r : rawChapters) rawArr.add(r);
            obj.add("rawChapters", rawArr);

            JsonObject transObj = new JsonObject();
            for (Map.Entry<Integer, String> entry : translatedChapters.entrySet()) {
                transObj.addProperty(String.valueOf(entry.getKey()), entry.getValue());
            }
            obj.add("translatedChapters", transObj);

            JsonObject glossObj = new JsonObject();
            for (Map.Entry<String, String> entry : masterGlossary.entrySet()) {
                glossObj.addProperty(entry.getKey(), entry.getValue());
            }
            obj.add("masterGlossary", glossObj);

            java.io.FileOutputStream fos = new java.io.FileOutputStream(pFile);
            fos.write(obj.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));
            fos.flush();
            fos.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void loadCurrentProjectData(String name) {
        try {
            rawChapters.clear();
            translatedChapters.clear();
            masterGlossary.clear();
            loadedRawContent = "";
            currentChapterIdx = 0;

            java.io.File pFile = new java.io.File(new java.io.File(getFilesDir(), "projects"), name + ".json");
            if (pFile.exists()) {
                java.io.FileInputStream fis = new java.io.FileInputStream(pFile);
                byte[] data = new byte[(int) pFile.length()];
                fis.read(data);
                fis.close();
                String jsonStr = new String(data, java.nio.charset.StandardCharsets.UTF_8);
                JsonObject obj = gson.fromJson(jsonStr, JsonObject.class);
                if (obj != null) {
                    if (obj.has("currentChapterIdx")) currentChapterIdx = obj.get("currentChapterIdx").getAsInt();
                    if (obj.has("loadedRawContent")) loadedRawContent = obj.get("loadedRawContent").getAsString();

                    if (obj.has("rawChapters")) {
                        JsonArray arr = obj.getAsJsonArray("rawChapters");
                        for (int i = 0; i < arr.size(); i++) rawChapters.add(arr.get(i).getAsString());
                    }
                    if (obj.has("translatedChapters")) {
                        JsonObject tObj = obj.getAsJsonObject("translatedChapters");
                        for (String k : tObj.keySet()) {
                            translatedChapters.put(Integer.parseInt(k), tObj.get(k).getAsString());
                        }
                    }
                    if (obj.has("masterGlossary")) {
                        JsonObject gObj = obj.getAsJsonObject("masterGlossary");
                        for (String k : gObj.keySet()) {
                            masterGlossary.put(k, gObj.get(k).getAsString());
                        }
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void loadAllState() {
        SharedPreferences sp = getSharedPreferences("droid_prefs", Context.MODE_PRIVATE);
        boolean hasSaved = sp.contains("current_project_name");

        if (hasSaved) {
            currentProjectName = sp.getString("current_project_name", "Dai_Quan_Gia_Ma_Hoang");
            currentModel = sp.getString("current_model", "gemini-2.5-flash");
            delaySec = sp.getInt("delay_sec", 2);

            String pListJson = sp.getString("project_list", null);
            if (pListJson != null) {
                java.lang.reflect.Type listType = new com.google.gson.reflect.TypeToken<ArrayList<String>>(){}.getType();
                List<String> list = gson.fromJson(pListJson, listType);
                if (list != null && !list.isEmpty()) {
                    projectList.clear();
                    projectList.addAll(list);
                }
            }

            String keysJson = sp.getString("api_keys", null);
            if (keysJson != null) {
                java.lang.reflect.Type keyType = new com.google.gson.reflect.TypeToken<ArrayList<ApiKeyItem>>(){}.getType();
                List<ApiKeyItem> kList = gson.fromJson(keysJson, keyType);
                if (kList != null && !kList.isEmpty()) {
                    apiKeys.clear();
                    apiKeys.addAll(kList);
                }
            }

            String promptsJson = sp.getString("prompt_cards", null);
            if (promptsJson != null) {
                java.lang.reflect.Type pType = new com.google.gson.reflect.TypeToken<ArrayList<PromptCardItem>>(){}.getType();
                List<PromptCardItem> pList = gson.fromJson(promptsJson, pType);
                if (pList != null && !pList.isEmpty()) {
                    promptCards.clear();
                    promptCards.addAll(pList);
                }
            }

            minTermLength = sp.getInt("min_term_length", 2);
            minFrequency = sp.getInt("min_frequency", 2);
            conflictPolicy = sp.getString("conflict_policy", "keep-old");
            antiHanziStrict = sp.getBoolean("anti_hanzi_strict", true);
            targetLanguage = sp.getString("target_language", "Tiếng Việt");
            cooldownSeconds = sp.getInt("cooldown_seconds", 60);
            rotationStrategy = sp.getString("rotation_strategy", "round-robin");
            contextSnippetLength = sp.getInt("context_snippet_len", 350);

            loadCurrentProjectData(currentProjectName);
        } else {
            initSampleData();
            saveAllState();
        }
    }

    private void initSampleData() {
        projectList.add("Dai_Quan_Gia_Ma_Hoang");
        projectList.add("Pham_Nhan_Tu_Tien");

        apiKeys.add(new ApiKeyItem("AIzaSyDemoSampleKeyNumberOneXYZ12345"));
        apiKeys.add(new ApiKeyItem("AIzaSyDemoSampleKeyNumberTwoABC67890"));

        masterGlossary.put("林辰", "Lâm Thần");
        masterGlossary.put("青云宗", "Thanh Vân Tông");
        masterGlossary.put("赵霸天", "Triệu Bá Thiên");
        masterGlossary.put("黑风寨", "Hắc Phong Trại");

        promptCards.add(new PromptCardItem(1, "Tiên Hiệp (Chuẩn mực)", "Dịch sang tiếng Việt tiểu thuyết tiên hiệp trôi chảy, đúng ngữ pháp. Động từ dịch nghĩa tự nhiên, không thô Hán-Việt. Xưng hô: hắn, nàng, ta, ngươi. Tên riêng giữ âm Hán-Việt.", true));
        promptCards.add(new PromptCardItem(2, "Đô Thị (Mượt mà)", "Dịch văn phong hiện đại đời thường mượt mà. Giữ nguyên tên nhân vật Hán-Việt.", false));
        promptCards.add(new PromptCardItem(3, "Huyền Huyễn / Sử Thi", "Dịch tiểu thuyết kỳ ảo, giữ nguyên thuật ngữ ma pháp, văn phong hào hùng.", false));

        String nl = String.valueOf((char) 10);
        rawChapters.add("第一章 少年与剑" + nl + "在偏僻的青石村中，有一位身负残破木剑的少年，名为林辰。" + nl + "林辰背着一把长剑，走在深邃的巷子里...");
        rawChapters.add("第二章 青云仙宗" + nl + "青云宗山门耸立在云海之巅，气势磅礴。" + nl + "数以千计的年轻才俊汇聚在巨大的演武广场上...");

        translatedChapters.put(0, "Chương 1: Thiếu Niên Và Kiếm" + nl + nl + "Tại thôn Thanh Thạch hẻo lánh, có một thiếu niên mang trên lưng thanh mộc kiếm tàn tạ, tên gọi Lâm Thần..." + nl);
    }

    private void initUI() {
        rootFrame = new FrameLayout(this);
        rootFrame.setBackgroundColor(Color.parseColor("#0A0A0A"));

        mainContentLayout = new LinearLayout(this);
        mainContentLayout.setOrientation(LinearLayout.VERTICAL);

        // Header Bar
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setPadding(32, 24, 32, 24);
        header.setBackgroundColor(Color.parseColor("#141414"));
        header.setGravity(Gravity.CENTER_VERTICAL);

        TextView tvTitle = new TextView(this);
        tvTitle.setText("DroidTranslator Native");
        tvTitle.setTextColor(Color.WHITE);
        tvTitle.setTextSize(17);
        tvTitle.setTypeface(null, Typeface.BOLD);
        header.addView(tvTitle, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

        TextView tvBadge = new TextView(this);
        tvBadge.setText(RootController.isRootAvailable() ? "ROOT #" : "GOD-MODE");
        tvBadge.setTextColor(Color.parseColor("#F59E0B"));
        tvBadge.setTextSize(11);
        tvBadge.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        tvBadge.setPadding(12, 6, 12, 6);
        header.addView(tvBadge);

        mainContentLayout.addView(header);

        // Container cho nội dung 4 Tab
        containerLayout = new FrameLayout(this);
        LinearLayout.LayoutParams containerParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1.0f
        );
        mainContentLayout.addView(containerLayout, containerParams);

        // Khởi tạo 4 Tab View theo thứ tự
        createTabKeysView();        // Tab 1: Key & Prompt
        createTabTranslateView();   // Tab 2: Dịch & Glossary
        createTabReaderView();      // Tab 3: Bản dịch & Đọc
        createTabSettingsView();    // Tab 4: Cài đặt

        containerLayout.addView(tabKeysView);
        containerLayout.addView(tabTranslateView);
        containerLayout.addView(tabReaderView);
        containerLayout.addView(tabSettingsView);

        // Bottom Navigation TabLayout
        tabLayout = new TabLayout(this);
        tabLayout.setBackgroundColor(Color.parseColor("#141414"));
        tabLayout.setTabTextColors(Color.parseColor("#888888"), Color.parseColor("#3B82F6"));
        tabLayout.setSelectedTabIndicatorColor(Color.parseColor("#3B82F6"));

        tabLayout.addTab(tabLayout.newTab().setText("Key & Prompt"));
        tabLayout.addTab(tabLayout.newTab().setText("Dịch & Từ điển"));
        tabLayout.addTab(tabLayout.newTab().setText("Bản dịch & Đọc"));
        tabLayout.addTab(tabLayout.newTab().setText("Cài đặt"));

        tabLayout.addOnTabSelectedListener(new TabLayout.OnTabSelectedListener() {
            @Override
            public void onTabSelected(TabLayout.Tab tab) {
                switchTab(tab.getPosition());
            }
            @Override public void onTabUnselected(TabLayout.Tab tab) {}
            @Override public void onTabReselected(TabLayout.Tab tab) {}
        });

        mainContentLayout.addView(tabLayout);
        rootFrame.addView(mainContentLayout, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        // Khởi tạo Trình Đọc Toàn Màn Hình Overlay (mặc định GONE)
        createFullScreenReaderOverlay();
        rootFrame.addView(flReaderOverlay, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        setContentView(rootFrame);

        // Mặc định mở Tab 1 (Key & Prompt)
        switchTab(0);
    }

    private void switchTab(int index) {
        tabKeysView.setVisibility(index == 0 ? View.VISIBLE : View.GONE);
        tabTranslateView.setVisibility(index == 1 ? View.VISIBLE : View.GONE);
        tabReaderView.setVisibility(index == 2 ? View.VISIBLE : View.GONE);
        tabSettingsView.setVisibility(index == 3 ? View.VISIBLE : View.GONE);

        if (index == 1) {
            refreshGlossaryList();
        } else if (index == 2) {
            refreshChapterListView();
        } else if (index == 3) {
            refreshSettingsUI();
        }
    }

    // =========================================================================
    // THẺ 1: KEY & PROMPT
    // =========================================================================
    private void createTabKeysView() {
        tabKeysView = new ScrollView(this);
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(32, 24, 32, 32);

        // 1. CHỌN DÒNG MODEL GEMINI
        TextView tvModelHead = new TextView(this);
        tvModelHead.setText("1. Chọn Dòng Model Gemini:");
        tvModelHead.setTextColor(Color.WHITE);
        tvModelHead.setTextSize(15);
        tvModelHead.setTypeface(null, Typeface.BOLD);
        content.addView(tvModelHead);

        tvSelectedModel = new TextView(this);
        tvSelectedModel.setText("Model đang chọn: " + currentModel);
        tvSelectedModel.setTextColor(Color.parseColor("#60A5FA"));
        tvSelectedModel.setPadding(0, 4, 0, 12);
        content.addView(tvSelectedModel);

        String[] models = {"gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3.5-flash-lite", "gemini-2.5-pro"};
        LinearLayout rowM = new LinearLayout(this);
        rowM.setOrientation(LinearLayout.HORIZONTAL);
        for (String m : models) {
            String label = m.replace("gemini-", "");
            Button b = createButton(label, "#1E293B");
            b.setOnClickListener(v -> {
                currentModel = m;
                tvSelectedModel.setText("Model đang chọn: " + currentModel);
                Toast.makeText(this, "Đã chọn " + m, Toast.LENGTH_SHORT).show();
            });
            rowM.addView(b, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));
        }
        content.addView(rowM);

        // Custom Model ID Input
        LinearLayout rowCustom = new LinearLayout(this);
        rowCustom.setOrientation(LinearLayout.HORIZONTAL);
        rowCustom.setPadding(0, 12, 0, 24);

        EditText edtCustomModel = new EditText(this);
        edtCustomModel.setHint("Nhập model tùy biến (VD: gemini-3.5-flash-lite)...");
        edtCustomModel.setHintTextColor(Color.parseColor("#666666"));
        edtCustomModel.setTextColor(Color.WHITE);
        edtCustomModel.setBackgroundColor(Color.parseColor("#171717"));
        edtCustomModel.setPadding(16, 16, 16, 16);
        rowCustom.addView(edtCustomModel, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

        View sc1 = new View(this);
        rowCustom.addView(sc1, new LinearLayout.LayoutParams(12, 1));

        Button btnSetCustom = createButton("Dùng Model Này", "#2563EB");
        btnSetCustom.setOnClickListener(v -> {
            String cm = edtCustomModel.getText().toString().trim();
            if (!cm.isEmpty()) {
                currentModel = cm;
                tvSelectedModel.setText("Model đang chọn: " + currentModel);
                Toast.makeText(this, "Đã kích hoạt model: " + cm, Toast.LENGTH_SHORT).show();
            }
        });
        rowCustom.addView(btnSetCustom);
        content.addView(rowCustom);

        // 2. MULTI-KEY POOL & TEST KEY
        LinearLayout keyHeaderRow = new LinearLayout(this);
        keyHeaderRow.setOrientation(LinearLayout.HORIZONTAL);
        keyHeaderRow.setGravity(Gravity.CENTER_VERTICAL);

        TextView tvKeyHead = new TextView(this);
        tvKeyHead.setText("2. Multi-Key Gemini Pool:");
        tvKeyHead.setTextColor(Color.WHITE);
        tvKeyHead.setTextSize(15);
        tvKeyHead.setTypeface(null, Typeface.BOLD);
        keyHeaderRow.addView(tvKeyHead, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

        Button btnTestAll = createButton("Test Tất Cả", "#B45309");
        btnTestAll.setOnClickListener(v -> testAllKeys());
        keyHeaderRow.addView(btnTestAll);
        content.addView(keyHeaderRow);

        edtNewKey = new EditText(this);
        edtNewKey.setHint("Dán API Key (Hỗ trợ nạp hàng loạt: mỗi dòng 1 key, tự động tách thẻ)...");
        edtNewKey.setHintTextColor(Color.parseColor("#666666"));
        edtNewKey.setTextColor(Color.WHITE);
        edtNewKey.setBackgroundColor(Color.parseColor("#171717"));
        edtNewKey.setPadding(20, 16, 20, 16);
        edtNewKey.setMinLines(2);
        content.addView(edtNewKey);

        Button btnAddKey = createButton("Thêm API Key Vào Pool", "#D97706");
        btnAddKey.setOnClickListener(v -> {
            String k = edtNewKey.getText().toString().trim();
            if (!k.isEmpty()) {
                String nl = String.valueOf((char) 10);
                String[] lines = k.split(nl);
                int countAdded = 0;
                for (String line : lines) {
                    String single = line.trim().replace(String.valueOf((char) 34), "").replace(String.valueOf((char) 39), "");
                    if (single.length() >= 8 && !single.startsWith("#") && !single.startsWith("//")) {
                        boolean exists = false;
                        for (ApiKeyItem item : apiKeys) {
                            if (item.key.equals(single)) { exists = true; break; }
                        }
                        if (!exists) {
                            apiKeys.add(new ApiKeyItem(single));
                            countAdded++;
                        }
                    }
                }
                edtNewKey.setText("");
                refreshKeyList();
                Toast.makeText(this, "Đã nạp thành công " + countAdded + " Key vào Pool!", Toast.LENGTH_SHORT).show();
            }
        });
        content.addView(btnAddKey);

        llKeyList = new LinearLayout(this);
        llKeyList.setOrientation(LinearLayout.VERTICAL);
        llKeyList.setPadding(0, 12, 0, 24);
        content.addView(llKeyList);
        refreshKeyList();

        // 3. THẺ PROMPT PHONG CÁCH
        LinearLayout promptHeaderRow = new LinearLayout(this);
        promptHeaderRow.setOrientation(LinearLayout.HORIZONTAL);
        promptHeaderRow.setGravity(Gravity.CENTER_VERTICAL);

        TextView tvPromptHead = new TextView(this);
        tvPromptHead.setText("3. Thẻ Prompt Dịch Thuật:");
        tvPromptHead.setTextColor(Color.WHITE);
        tvPromptHead.setTextSize(15);
        tvPromptHead.setTypeface(null, Typeface.BOLD);
        promptHeaderRow.addView(tvPromptHead, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

        Button btnAddPrompt = createButton("+ Thêm Prompt", "#2563EB");
        btnAddPrompt.setOnClickListener(v -> showPromptDialog(null));
        promptHeaderRow.addView(btnAddPrompt);
        content.addView(promptHeaderRow);

        llPromptCards = new LinearLayout(this);
        llPromptCards.setOrientation(LinearLayout.VERTICAL);
        llPromptCards.setPadding(0, 12, 0, 16);
        content.addView(llPromptCards);
        refreshPromptList();

        tabKeysView.addView(content);
    }

    private void testAllKeys() {
        Toast.makeText(this, "Đang kiểm tra " + apiKeys.size() + " API Key...", Toast.LENGTH_SHORT).show();
        new Thread(() -> {
            for (ApiKeyItem item : apiKeys) {
                engine.testKey(item);
                mainHandler.post(this::refreshKeyList);
            }
            mainHandler.post(() -> Toast.makeText(MainActivity.this, "🎉 Đã hoàn tất kiểm tra Key Pool!", Toast.LENGTH_SHORT).show());
        }).start();
    }

    private void refreshKeyList() {
        llKeyList.removeAllViews();
        for (int i = 0; i < apiKeys.size(); i++) {
            final int idx = i;
            ApiKeyItem item = apiKeys.get(idx);

            LinearLayout row = new LinearLayout(this);
            row.setOrientation(LinearLayout.HORIZONTAL);
            row.setPadding(20, 14, 20, 14);
            row.setGravity(Gravity.CENTER_VERTICAL);
            GradientDrawable rowBg = new GradientDrawable();
            rowBg.setColor(Color.parseColor("#161B22"));
            rowBg.setCornerRadius(18f);
            rowBg.setStroke(2, Color.parseColor("#30363D"));
            row.setBackground(rowBg);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, 0, 0, 8);
            row.setLayoutParams(lp);

            TextView tvK = new TextView(this);
            String masked = item.key.length() > 8 ? "..." + item.key.substring(item.key.length() - 8) : item.key;
            tvK.setText("Key #" + (idx + 1) + ": " + masked + " (" + item.state + ")");
            tvK.setTextColor(Color.WHITE);
            row.addView(tvK, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

            Button btnTest = createButton("Test", "#374151");
            btnTest.setOnClickListener(v -> {
                btnTest.setText("...");
                new Thread(() -> {
                    boolean ok = engine.testKey(item);
                    mainHandler.post(() -> {
                        btnTest.setText("Test");
                        refreshKeyList();
                        Toast.makeText(MainActivity.this, ok ? "✅ Key hoạt động tốt!" : "❌ Key lỗi hoặc hết hạn!", Toast.LENGTH_SHORT).show();
                    });
                }).start();
            });
            row.addView(btnTest);

            Button btnDel = createButton("Xóa", "#7F1D1D");
            btnDel.setOnClickListener(v -> {
                apiKeys.remove(idx);
                refreshKeyList();
            });
            row.addView(btnDel);

            llKeyList.addView(row);
        }
    }

    private void showPromptDialog(PromptCardItem editingItem) {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle(editingItem != null ? "Sửa Thẻ Prompt" : "Thêm Thẻ Prompt Mới");

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 24, 32, 24);

        TextView tvTitleLabel = new TextView(this);
        tvTitleLabel.setText("Tiêu đề phong cách:");
        layout.addView(tvTitleLabel);

        EditText edtTitle = new EditText(this);
        edtTitle.setText(editingItem != null ? editingItem.title : "");
        layout.addView(edtTitle);

        TextView tvContentLabel = new TextView(this);
        tvContentLabel.setText("Nội dung System Prompt:");
        tvContentLabel.setPadding(0, 16, 0, 0);
        layout.addView(tvContentLabel);

        EditText edtContent = new EditText(this);
        edtContent.setLines(4);
        edtContent.setText(editingItem != null ? editingItem.content : "");
        layout.addView(edtContent);

        builder.setView(layout);

        builder.setPositiveButton("Lưu", (dialog, which) -> {
            String t = edtTitle.getText().toString().trim();
            String c = edtContent.getText().toString().trim();
            if (!t.isEmpty() && !c.isEmpty()) {
                if (editingItem != null) {
                    editingItem.title = t;
                    editingItem.content = c;
                } else {
                    for (PromptCardItem p : promptCards) p.active = false;
                    promptCards.add(new PromptCardItem(System.currentTimeMillis(), t, c, true));
                }
                refreshPromptList();
            }
        });
        builder.setNegativeButton("Hủy", null);
        builder.show();
    }

    private void refreshPromptList() {
        llPromptCards.removeAllViews();
        for (PromptCardItem p : promptCards) {
            LinearLayout c = createCard();
            GradientDrawable promptBg = new GradientDrawable();
            promptBg.setColor(Color.parseColor(p.active ? "#1E293B" : "#161B22"));
            promptBg.setCornerRadius(22f);
            promptBg.setStroke(p.active ? 3 : 1, Color.parseColor(p.active ? "#3B82F6" : "#30363D"));
            c.setBackground(promptBg);

            LinearLayout topRow = new LinearLayout(this);
            topRow.setOrientation(LinearLayout.HORIZONTAL);
            topRow.setGravity(Gravity.CENTER_VERTICAL);

            TextView t = new TextView(this);
            t.setText(p.title + (p.active ? " (Đang dùng)" : ""));
            t.setTextColor(Color.parseColor(p.active ? "#60A5FA" : "#FFFFFF"));
            t.setTypeface(null, Typeface.BOLD);
            topRow.addView(t, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

            Button btnEdit = createButton("Sửa", "#374151");
            btnEdit.setOnClickListener(v -> showPromptDialog(p));
            topRow.addView(btnEdit);

            View sp1 = new View(this);
            topRow.addView(sp1, new LinearLayout.LayoutParams(8, 1));

            Button btnDel = createButton("Xóa", "#7F1D1D");
            btnDel.setOnClickListener(v -> {
                if (promptCards.size() <= 1) {
                    Toast.makeText(this, "Phải giữ lại ít nhất 1 thẻ Prompt!", Toast.LENGTH_SHORT).show();
                    return;
                }
                promptCards.remove(p);
                if (!promptCards.stream().anyMatch(item -> item.active)) {
                    promptCards.get(0).active = true;
                }
                refreshPromptList();
                Toast.makeText(this, "Đã xóa thẻ prompt!", Toast.LENGTH_SHORT).show();
            });
            topRow.addView(btnDel);

            c.addView(topRow);

            TextView cnt = new TextView(this);
            cnt.setText(p.content);
            cnt.setTextColor(Color.parseColor("#9CA3AF"));
            cnt.setTextSize(12);
            cnt.setPadding(0, 8, 0, 0);
            c.addView(cnt);

            c.setOnClickListener(v -> {
                for (PromptCardItem other : promptCards) other.active = (other.id == p.id);
                refreshPromptList();
                Toast.makeText(this, "Đã chọn phong cách: " + p.title, Toast.LENGTH_SHORT).show();
            });

            llPromptCards.addView(c);
        }
    }

    // =========================================================================
    // THẺ 2: DỊCH & TỪ ĐIỂN GLOSSARY
    // =========================================================================
    private void createTabTranslateView() {
        tabTranslateView = new ScrollView(this);
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(32, 24, 32, 32);

        // 1. Quản lý Dự Án Truyện (Multi-Project Switcher)
        LinearLayout cardProj = createCard();
        LinearLayout rowProjHeader = new LinearLayout(this);
        rowProjHeader.setOrientation(LinearLayout.HORIZONTAL);
        rowProjHeader.setGravity(Gravity.CENTER_VERTICAL);

        tvCurrentProjectName = new TextView(this);
        tvCurrentProjectName.setText("📖 Dự án: " + currentProjectName);
        tvCurrentProjectName.setTextColor(Color.parseColor("#60A5FA"));
        tvCurrentProjectName.setTextSize(14);
        tvCurrentProjectName.setTypeface(null, Typeface.BOLD);
        rowProjHeader.addView(tvCurrentProjectName, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

        Button btnSwitchProj = createButton("Đổi Truyện", "#1E293B");
        btnSwitchProj.setOnClickListener(v -> showSwitchProjectDialog());
        rowProjHeader.addView(btnSwitchProj);

        View sproj = new View(this);
        rowProjHeader.addView(sproj, new LinearLayout.LayoutParams(8, 1));

        Button btnNewProj = createButton("+ Dự Án Mới", "#2563EB");
        btnNewProj.setOnClickListener(v -> showNewProjectDialog());
        rowProjHeader.addView(btnNewProj);

        cardProj.addView(rowProjHeader);
        content.addView(cardProj);

        // 2. Thẻ Tiến độ & Dịch theo Range (Từ chương -> Đến chương, 3 nút: Dịch / Tạm dừng / Hủy)
        LinearLayout cardProgress = createCard();

        tvProgressText = new TextView(this);
        tvProgressText.setTextColor(Color.parseColor("#93C5FD"));
        tvProgressText.setTextSize(14);
        tvProgressText.setTypeface(null, Typeface.BOLD);
        tvProgressText.setText("Tiến độ: " + translatedChapters.size() + " / " + rawChapters.size() + " chương");
        cardProgress.addView(tvProgressText);

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(Math.max(rawChapters.size(), 1));
        progressBar.setProgress(translatedChapters.size());
        cardProgress.addView(progressBar);

        // Range inputs: Từ chương -> Đến chương
        LinearLayout rangeRow = new LinearLayout(this);
        rangeRow.setOrientation(LinearLayout.HORIZONTAL);
        rangeRow.setPadding(0, 16, 0, 8);
        rangeRow.setGravity(Gravity.CENTER_VERTICAL);

        TextView tvF = new TextView(this);
        tvF.setText("Từ chương: ");
        tvF.setTextColor(Color.parseColor("#CCCCCC"));
        rangeRow.addView(tvF);

        edtFromChap = new EditText(this);
        edtFromChap.setText("1");
        edtFromChap.setTextColor(Color.WHITE);
        edtFromChap.setBackgroundColor(Color.parseColor("#171717"));
        edtFromChap.setPadding(12, 8, 12, 8);
        rangeRow.addView(edtFromChap, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

        View srf = new View(this);
        rangeRow.addView(srf, new LinearLayout.LayoutParams(16, 1));

        TextView tvT = new TextView(this);
        tvT.setText("Đến chương: ");
        tvT.setTextColor(Color.parseColor("#CCCCCC"));
        rangeRow.addView(tvT);

        edtToChap = new EditText(this);
        edtToChap.setText(String.valueOf(Math.max(rawChapters.size(), 1)));
        edtToChap.setTextColor(Color.WHITE);
        edtToChap.setBackgroundColor(Color.parseColor("#171717"));
        edtToChap.setPadding(12, 8, 12, 8);
        rangeRow.addView(edtToChap, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

        cardProgress.addView(rangeRow);

        // 3 Nút: Dịch Range, Tạm dừng / Tiếp tục, Hủy
        LinearLayout btnRow = new LinearLayout(this);
        btnRow.setOrientation(LinearLayout.HORIZONTAL);
        btnRow.setPadding(0, 8, 0, 0);

        btnStartRange = createButton("Dịch Range", "#2563EB");
        btnStartRange.setOnClickListener(v -> startRangeTranslation());
        btnRow.addView(btnStartRange, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

        View sb1 = new View(this);
        btnRow.addView(sb1, new LinearLayout.LayoutParams(8, 1));

        btnPauseResume = createButton("Tạm dừng", "#D97706");
        btnPauseResume.setOnClickListener(v -> togglePauseResume());
        btnRow.addView(btnPauseResume, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

        View sb2 = new View(this);
        btnRow.addView(sb2, new LinearLayout.LayoutParams(8, 1));

        btnCancelTrans = createButton("Hủy", "#7F1D1D");
        btnCancelTrans.setOnClickListener(v -> cancelTranslation());
        btnRow.addView(btnCancelTrans, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

        cardProgress.addView(btnRow);
        content.addView(cardProgress);

        // 3. Nạp văn bản truyện + Chọn file từ bộ nhớ + Tách chương tùy ý ký tự
        TextView tvInputTitle = new TextView(this);
        tvInputTitle.setText("Nạp văn bản truyện thô:");
        tvInputTitle.setTextColor(Color.WHITE);
        tvInputTitle.setPadding(0, 16, 0, 8);
        content.addView(tvInputTitle);

        edtRawText = new EditText(this);
        edtRawText.setTextColor(Color.WHITE);
        edtRawText.setBackgroundColor(Color.parseColor("#171717"));
        edtRawText.setPadding(20, 16, 20, 16);
        edtRawText.setHint("Dán truyện hoặc bấm Chọn File .txt...");
        edtRawText.setHintTextColor(Color.parseColor("#666666"));
        edtRawText.setLines(3);
        content.addView(edtRawText);

        // Hàng nút: Chọn file từ bộ nhớ
        LinearLayout fileRow = new LinearLayout(this);
        fileRow.setOrientation(LinearLayout.HORIZONTAL);
        fileRow.setPadding(0, 8, 0, 0);

        Button btnPickFile = createButton("📂 Chọn File .txt Từ Bộ Nhớ", "#1E293B");
        btnPickFile.setOnClickListener(v -> openFilePicker());
        fileRow.addView(btnPickFile, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));
        content.addView(fileRow);

        // Hàng tách chương: Theo tác giả vs Theo số ký tự tùy chỉnh
        LinearLayout splitOptRow = new LinearLayout(this);
        splitOptRow.setOrientation(LinearLayout.HORIZONTAL);
        splitOptRow.setPadding(0, 8, 0, 8);
        splitOptRow.setGravity(Gravity.CENTER_VERTICAL);

        Button btnSplitAuthor = createButton("Tách Tác Giả (Regex)", "#047857");
        btnSplitAuthor.setOnClickListener(v -> splitRawText(false));
        splitOptRow.addView(btnSplitAuthor);

        View ssp = new View(this);
        splitOptRow.addView(ssp, new LinearLayout.LayoutParams(8, 1));

        edtChunkSize = new EditText(this);
        edtChunkSize.setText("3500");
        edtChunkSize.setTextColor(Color.WHITE);
        edtChunkSize.setBackgroundColor(Color.parseColor("#171717"));
        edtChunkSize.setPadding(10, 8, 10, 8);
        edtChunkSize.setHint("Ký tự");
        splitOptRow.addView(edtChunkSize, new LinearLayout.LayoutParams(140, ViewGroup.LayoutParams.WRAP_CONTENT));

        View ssp2 = new View(this);
        splitOptRow.addView(ssp2, new LinearLayout.LayoutParams(8, 1));

        Button btnSplitChars = createButton("Tách Theo Ký Tự", "#0369A1");
        btnSplitChars.setOnClickListener(v -> splitRawText(true));
        splitOptRow.addView(btnSplitChars, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

        content.addView(splitOptRow);

        // 4. Master Glossary (Tự Động Bóc Tách & Nạp Tức Thì Sau Mỗi Chương)
        tvGlossaryHeader = new TextView(this);
        tvGlossaryHeader.setText("Từ Điển Master Glossary (" + masterGlossary.size() + " từ):");
        tvGlossaryHeader.setTextColor(Color.WHITE);
        tvGlossaryHeader.setTextSize(14);
        tvGlossaryHeader.setTypeface(null, Typeface.BOLD);
        tvGlossaryHeader.setPadding(0, 20, 0, 8);
        content.addView(tvGlossaryHeader);

        LinearLayout rowAddG = new LinearLayout(this);
        rowAddG.setOrientation(LinearLayout.HORIZONTAL);

        edtGlossaryKey = createStyledEditText("Từ gốc (林辰)");
        rowAddG.addView(edtGlossaryKey, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

        View sg = new View(this);
        rowAddG.addView(sg, new LinearLayout.LayoutParams(12, 1));

        edtGlossaryVal = createStyledEditText("Nghĩa (Lâm Thần)");
        rowAddG.addView(edtGlossaryVal, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

        content.addView(rowAddG);

        LinearLayout rowGButtons = new LinearLayout(this);
        rowGButtons.setOrientation(LinearLayout.HORIZONTAL);
        rowGButtons.setPadding(0, 10, 0, 8);

        Button btnAddG = createButton("+ Thêm Từ", "#059669");
        btnAddG.setOnClickListener(v -> {
            String k = edtGlossaryKey.getText().toString().trim();
            String val = edtGlossaryVal.getText().toString().trim();
            if (!k.isEmpty() && !val.isEmpty()) {
                masterGlossary.put(k, val);
                edtGlossaryKey.setText("");
                edtGlossaryVal.setText("");
                saveCurrentProjectData();
                refreshGlossaryList();
                Toast.makeText(this, "Đã thêm thuật ngữ!", Toast.LENGTH_SHORT).show();
            }
        });
        rowGButtons.addView(btnAddG, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.2f));

        View sgb1 = new View(this);
        rowGButtons.addView(sgb1, new LinearLayout.LayoutParams(8, 1));

        Button btnImportG = createButton("📥 Nạp .txt", "#1D4ED8");
        btnImportG.setOnClickListener(v -> openGlossaryFilePicker());
        rowGButtons.addView(btnImportG, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

        View sgb2 = new View(this);
        rowGButtons.addView(sgb2, new LinearLayout.LayoutParams(8, 1));

        Button btnExportG = createButton("📤 Xuất", "#374151");
        btnExportG.setOnClickListener(v -> exportGlossaryData());
        rowGButtons.addView(btnExportG, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 0.8f));

        content.addView(rowGButtons);

        llGlossaryList = new LinearLayout(this);
        llGlossaryList.setOrientation(LinearLayout.VERTICAL);
        llGlossaryList.setPadding(0, 8, 0, 16);
        content.addView(llGlossaryList);
        refreshGlossaryList();

        // 5. Live Console Logs
        TextView tvLogTitle = new TextView(this);
        tvLogTitle.setText("Live Console Logs:");
        tvLogTitle.setTextColor(Color.parseColor("#9CA3AF"));
        tvLogTitle.setPadding(0, 16, 0, 8);
        content.addView(tvLogTitle);

        tvLiveLogs = new TextView(this);
        tvLiveLogs.setBackgroundColor(Color.parseColor("#050505"));
        tvLiveLogs.setTextColor(Color.parseColor("#10B981"));
        tvLiveLogs.setTextSize(11);
        tvLiveLogs.setPadding(16, 16, 16, 16);
        tvLiveLogs.setText("🚀 DroidTranslator Native Sẵn Sàng!\n");
        content.addView(tvLiveLogs);

        tabTranslateView.addView(content);
    }

    private void showNewProjectDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Tạo Dự Án Dịch Mới");

        EditText input = new EditText(this);
        input.setHint("Nhập tên truyện (VD: Tien_Nghich)");
        builder.setView(input);

        builder.setPositiveButton("Tạo Mới", (dialog, which) -> {
            String name = input.getText().toString().trim().replace(" ", "_");
            if (!name.isEmpty()) {
                saveCurrentProjectData();
                if (!projectList.contains(name)) {
                    projectList.add(name);
                }
                currentProjectName = name;
                tvCurrentProjectName.setText("📖 Dự án: " + currentProjectName);

                // Làm mới dữ liệu độc lập cho truyện mới
                rawChapters.clear();
                translatedChapters.clear();
                masterGlossary.clear();
                loadedRawContent = "";
                currentChapterIdx = 0;

                saveCurrentProjectData();
                saveAllState();

                updateProgressUI();
                refreshGlossaryList();
                refreshChapterListView();
                refreshSettingsUI();
                appendLog("📁 Đã tạo và chuyển sang dự án mới: " + name);
                Toast.makeText(this, "Đã tạo dự án mới: " + name, Toast.LENGTH_SHORT).show();
            }
        });
        builder.setNegativeButton("Hủy", null);
        builder.show();
    }

    private void showSwitchProjectDialog() {
        if (projectList.isEmpty()) return;
        String[] items = projectList.toArray(new String[0]);
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Chọn Dự Án Truyện");
        builder.setItems(items, (dialog, which) -> {
            String chosen = items[which];
            saveCurrentProjectData();
            currentProjectName = chosen;
            loadCurrentProjectData(chosen);
            saveAllState();

            tvCurrentProjectName.setText("📖 Dự án: " + currentProjectName);
            updateProgressUI();
            refreshGlossaryList();
            refreshChapterListView();
            refreshSettingsUI();
            appendLog("📁 Đã chuyển sang dự án: " + chosen + " (" + translatedChapters.size() + "/" + rawChapters.size() + " chương)");
            Toast.makeText(this, "Đã chọn dự án: " + chosen, Toast.LENGTH_SHORT).show();
        });
        builder.show();
    }

    private void deleteProject(String name) {
        if (projectList.size() <= 1) {
            Toast.makeText(this, "Không thể xóa dự án duy nhất còn lại!", Toast.LENGTH_SHORT).show();
            return;
        }

        try {
            java.io.File pFile = new java.io.File(new java.io.File(getFilesDir(), "projects"), name + ".json");
            if (pFile.exists()) {
                pFile.delete();
            }
            projectList.remove(name);
            String nextProject = projectList.get(0);
            currentProjectName = nextProject;
            loadCurrentProjectData(nextProject);
            saveAllState();

            tvCurrentProjectName.setText("📖 Dự án: " + currentProjectName);
            updateProgressUI();
            refreshGlossaryList();
            refreshChapterListView();
            refreshSettingsUI();
            appendLog("🗑️ Đã xóa vĩnh viễn dự án: " + name + ". Toàn bộ Key API và Prompt được bảo toàn 100%!");
            Toast.makeText(this, "Đã xóa dự án: " + name, Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            Toast.makeText(this, "Lỗi khi xóa dự án: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    private void showDeleteProjectConfirmationDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Xác Nhận Xóa Vĩnh Viễn Dự Án");
        String nl = String.valueOf((char) 10);
        builder.setMessage("Bạn có chắc chắn muốn xóa dự án [" + currentProjectName + "]?" + nl + nl + "• Toàn bộ chương thô, bản dịch và từ điển riêng của truyện này sẽ bị xóa khỏi bộ nhớ máy." + nl + "• Toàn bộ kho Key API và Thẻ Prompt sẽ ĐƯỢC BẢO TOÀN VĨNH CỬU 100%!");
        builder.setPositiveButton("Xác Nhận Xóa", (dialog, which) -> deleteProject(currentProjectName));
        builder.setNegativeButton("Hủy", null);
        builder.show();
    }

    private void openFilePicker() {
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.setType("*/*");
        String[] mimeTypes = {"text/plain", "application/epub+zip", "application/x-mobipocket-ebook", "application/octet-stream"};
        intent.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes);
        try {
            startActivityForResult(intent, REQUEST_PICK_FILE);
        } catch (Exception e) {
            Toast.makeText(this, "Không tìm thấy trình quản lý tệp: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    private void openGlossaryFilePicker() {
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.setType("text/*");
        try {
            startActivityForResult(intent, REQUEST_PICK_GLOSSARY_FILE);
        } catch (Exception e) {
            Toast.makeText(this, "Không tìm thấy trình quản lý tệp: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_PICK_FILE && resultCode == RESULT_OK && data != null) {
            Uri uri = data.getData();
            if (uri != null) {
                appendLog("⏳ Đang nạp và giải mã tệp Ebook từ bộ nhớ...");
                Toast.makeText(this, "Đang đọc tệp Ebook...", Toast.LENGTH_SHORT).show();
                new Thread(() -> {
                    try {
                        InputStream is = getContentResolver().openInputStream(uri);
                        String fileName = "ebook.txt";
                        try {
                            android.database.Cursor cursor = getContentResolver().query(uri, null, null, null, null);
                            if (cursor != null && cursor.moveToFirst()) {
                                int nameIndex = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME);
                                if (nameIndex != -1) fileName = cursor.getString(nameIndex);
                                cursor.close();
                            }
                        } catch (Exception ignored) {}

                        String lowerName = fileName.toLowerCase();
                        StringBuilder sb = new StringBuilder();
                        String nl = String.valueOf((char) 10);

                        if (lowerName.endsWith(".epub")) {
                            // Native Java EPUB ZIP parser
                            java.util.zip.ZipInputStream zis = new java.util.zip.ZipInputStream(is);
                            java.util.zip.ZipEntry entry;
                            while ((entry = zis.getNextEntry()) != null) {
                                String en = entry.getName().toLowerCase();
                                if ((en.endsWith(".xhtml") || en.endsWith(".html") || en.endsWith(".htm")) && !en.contains("toc")) {
                                    BufferedReader br = new BufferedReader(new InputStreamReader(zis, java.nio.charset.StandardCharsets.UTF_8));
                                    String l;
                                    StringBuilder htmlSb = new StringBuilder();
                                    while ((l = br.readLine()) != null) {
                                        htmlSb.append(l).append(nl);
                                    }
                                    // Làm sạch thẻ HTML
                                    String plain = htmlSb.toString()
                                            .replaceAll("(?i)<br[ \t\n\r]*/?>", nl)
                                            .replaceAll("(?i)</p>", nl + nl)
                                            .replaceAll("(?i)</div>", nl)
                                            .replaceAll("<[^>]+>", " ")
                                            .replaceAll("&nbsp;", " ")
                                            .replaceAll("&quot;", String.valueOf((char) 34))
                                            .replaceAll("&apos;", "'")
                                            .replaceAll("&lt;", "<")
                                            .replaceAll("&gt;", ">")
                                            .replaceAll("&amp;", "&")
                                            .trim();
                                    if (plain.length() > 50) {
                                        sb.append(plain).append(nl).append(nl);
                                    }
                                }
                                zis.closeEntry();
                            }
                            zis.close();
                        } else {
                            // TXT hoặc MOBI/AZW3 stream
                            BufferedReader reader = new BufferedReader(new InputStreamReader(is, java.nio.charset.StandardCharsets.UTF_8));
                            String line;
                            while ((line = reader.readLine()) != null) {
                                sb.append(line).append(nl);
                            }
                            reader.close();
                        }

                        final String fullText = sb.toString();
                        final String finalFileName = fileName;
                        mainHandler.post(() -> {
                            loadedRawContent = fullText;
                            if (fullText.length() > 6000) {
                                edtRawText.setText(fullText.substring(0, 3000) + nl + nl + "... [Đã nạp file Ebook (" + finalFileName + ") hoàn chỉnh " + fullText.length() + " ký tự]");
                            } else {
                                edtRawText.setText(fullText);
                            }
                            splitRawTextFromContent(fullText, false);
                            appendLog("📚 Đã nạp thành công file Ebook [" + finalFileName + "] (" + rawChapters.size() + " chương)!");
                            Toast.makeText(MainActivity.this, "Đã nạp file Ebook và tách " + rawChapters.size() + " chương thành công!", Toast.LENGTH_SHORT).show();
                        });
                    } catch (Exception e) {
                        mainHandler.post(() -> {
                            appendLog("❌ Lỗi đọc tệp Ebook: " + e.getMessage());
                            Toast.makeText(MainActivity.this, "Lỗi đọc tệp: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                        });
                    }
                }).start();
            }
        } else if (requestCode == REQUEST_PICK_GLOSSARY_FILE && resultCode == RESULT_OK && data != null) {
            Uri uri = data.getData();
            if (uri != null) {
                appendLog("⏳ Đang nạp tệp Glossary .txt từ bộ nhớ...");
                Toast.makeText(this, "Đang đọc tệp Glossary...", Toast.LENGTH_SHORT).show();
                new Thread(() -> {
                    try {
                        InputStream is = getContentResolver().openInputStream(uri);
                        BufferedReader reader = new BufferedReader(new InputStreamReader(is));
                        String line;
                        int count = 0;
                        while ((line = reader.readLine()) != null) {
                            line = line.trim();
                            if (line.isEmpty() || line.startsWith("#") || line.startsWith("//")) continue;
                            String raw = "";
                            String vi = "";
                            if (line.contains("=")) {
                                int eqIdx = line.indexOf("=");
                                raw = line.substring(0, eqIdx).trim();
                                vi = line.substring(eqIdx + 1).trim();
                            } else if (line.contains("➔")) {
                                int eqIdx = line.indexOf("➔");
                                raw = line.substring(0, eqIdx).trim();
                                vi = line.substring(eqIdx + 1).trim();
                            } else if (line.contains("->")) {
                                int eqIdx = line.indexOf("->");
                                raw = line.substring(0, eqIdx).trim();
                                vi = line.substring(eqIdx + 2).trim();
                            } else if (line.contains(":")) {
                                int eqIdx = line.indexOf(":");
                                raw = line.substring(0, eqIdx).trim();
                                vi = line.substring(eqIdx + 1).trim();
                            } else if (line.contains(String.valueOf((char) 9))) {
                                int eqIdx = line.indexOf((char) 9);
                                raw = line.substring(0, eqIdx).trim();
                                vi = line.substring(eqIdx + 1).trim();
                            }
                            if (!raw.isEmpty() && !vi.isEmpty()) {
                                masterGlossary.put(raw, vi);
                                count++;
                            }
                        }
                        reader.close();
                        final int importedCount = count;
                        mainHandler.post(() -> {
                            saveCurrentProjectData();
                            refreshGlossaryList();
                            appendLog("📚 Đã nạp thành công " + importedCount + " thuật ngữ vào Master Glossary của dự án [" + currentProjectName + "]!");
                            Toast.makeText(MainActivity.this, "Đã nạp thành công " + importedCount + " thuật ngữ!", Toast.LENGTH_SHORT).show();
                        });
                    } catch (Exception e) {
                        mainHandler.post(() -> {
                            appendLog("❌ Lỗi nạp Glossary: " + e.getMessage());
                            Toast.makeText(MainActivity.this, "Lỗi nạp tệp: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                        });
                    }
                }).start();
            }
        }
    }

    private void exportGlossaryData() {
        if (masterGlossary.isEmpty()) {
            Toast.makeText(this, "Kho từ điển đang trống!", Toast.LENGTH_SHORT).show();
            return;
        }
        StringBuilder sb = new StringBuilder();
        String nl = String.valueOf((char) 10);
        sb.append("# Master Glossary - ").append(currentProjectName).append(nl);
        sb.append("# Định dạng: tên raw=tên tiếng việt").append(nl).append(nl);
        for (Map.Entry<String, String> entry : masterGlossary.entrySet()) {
            sb.append(entry.getKey()).append("=").append(entry.getValue()).append(nl);
        }
        ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
        if (cm != null) {
            cm.setPrimaryClip(ClipData.newPlainText("Glossary", sb.toString()));
            appendLog("📋 Đã sao chép " + masterGlossary.size() + " thuật ngữ dạng raw=vi vào Clipboard!");
            Toast.makeText(this, "Đã sao chép " + masterGlossary.size() + " từ (dạng raw=vi) vào bộ nhớ tạm!", Toast.LENGTH_LONG).show();
        }
    }

    private void showEditGlossaryDialog(final String oldRaw, final String oldVi) {
        androidx.appcompat.app.AlertDialog.Builder builder = new androidx.appcompat.app.AlertDialog.Builder(this);
        builder.setTitle("Chỉnh Sửa Thuật Ngữ");

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(36, 24, 36, 16);

        TextView tvRawL = new TextView(this);
        tvRawL.setText("Từ gốc (Tiếng Trung / Raw):");
        tvRawL.setTextColor(Color.parseColor("#93C5FD"));
        tvRawL.setTextSize(12);
        layout.addView(tvRawL);

        final EditText edtRaw = createStyledEditText("VD: 林辰");
        edtRaw.setText(oldRaw);
        layout.addView(edtRaw);

        TextView tvViL = new TextView(this);
        tvViL.setText("Nghĩa dịch tiếng Việt chuẩn:");
        tvViL.setTextColor(Color.parseColor("#34D399"));
        tvViL.setTextSize(12);
        tvViL.setPadding(0, 16, 0, 0);
        layout.addView(tvViL);

        final EditText edtVi = createStyledEditText("VD: Lâm Thần");
        edtVi.setText(oldVi);
        layout.addView(edtVi);

        builder.setView(layout);
        builder.setPositiveButton("Lưu Thay Đổi", (dialog, which) -> {
            String newRaw = edtRaw.getText().toString().trim();
            String newVi = edtVi.getText().toString().trim();
            if (!newRaw.isEmpty() && !newVi.isEmpty()) {
                if (!newRaw.equals(oldRaw)) {
                    masterGlossary.remove(oldRaw);
                }
                masterGlossary.put(newRaw, newVi);
                saveCurrentProjectData();
                refreshGlossaryList();
                appendLog("✏️ Đã cập nhật thuật ngữ: [" + oldRaw + "] ➔ [" + newRaw + " = " + newVi + "]");
                Toast.makeText(MainActivity.this, "Đã cập nhật thuật ngữ!", Toast.LENGTH_SHORT).show();
            }
        });
        builder.setNegativeButton("Hủy", null);
        builder.show();
    }

    private void splitRawText(boolean byChars) {
        String text = (loadedRawContent != null && !loadedRawContent.isEmpty()) ? loadedRawContent : edtRawText.getText().toString().trim();
        splitRawTextFromContent(text, byChars);
    }

    private void splitRawTextFromContent(String text, boolean byChars) {
        if (text == null || text.trim().isEmpty()) {
            Toast.makeText(this, "Vui lòng dán văn bản truyện!", Toast.LENGTH_SHORT).show();
            return;
        }

        rawChapters.clear();
        chapterListPage = 0;
        if (!byChars) {
            String[] parts = text.split("(?=(第[0-9一二三四五六七八九十百千万]+[章回节卷]|Chương[ \t\n\r]*[0-9]+))");
            for (String p : parts) {
                if (!p.trim().isEmpty()) rawChapters.add(p.trim());
            }
        } else {
            int chunkSize = 3500;
            try {
                chunkSize = Integer.parseInt(edtChunkSize.getText().toString().trim());
            } catch (Exception ignored) {}
            chunkSize = Math.max(500, chunkSize);

            for (int i = 0; i < text.length(); i += chunkSize) {
                rawChapters.add(text.substring(i, Math.min(i + chunkSize, text.length())));
            }
        }

        if (rawChapters.isEmpty()) rawChapters.add(text);

        edtFromChap.setText("1");
        edtToChap.setText(String.valueOf(rawChapters.size()));
        saveCurrentProjectData();
        saveAllState();

        updateProgressUI();
        refreshChapterListView();
        appendLog("✂️ Đã tách thành " + rawChapters.size() + " chương (" + (byChars ? "Tùy ký tự" : "Theo tác giả") + ")");
        Toast.makeText(this, "Đã tách thành " + rawChapters.size() + " chương!", Toast.LENGTH_SHORT).show();
    }

    // Refresh UI Glossary List (Hiển thị 6 từ gần nhất chống khựng, có nút mở Kho Từ Điển Full)
    private void refreshGlossaryList() {
        if (llGlossaryList == null) return;
        llGlossaryList.removeAllViews();

        if (tvGlossaryHeader != null) {
            tvGlossaryHeader.setText("Từ Điển Master Glossary (" + masterGlossary.size() + " từ):");
        }

        if (masterGlossary.isEmpty()) {
            TextView tvEmpty = new TextView(this);
            tvEmpty.setText("Chưa có từ điển. Sau khi dịch mỗi chương, AI sẽ tự động thêm từ mới vào đây.");
            tvEmpty.setTextColor(Color.parseColor("#777777"));
            tvEmpty.setTextSize(11);
            tvEmpty.setPadding(0, 8, 0, 8);
            llGlossaryList.addView(tvEmpty);
            return;
        }

        // Hiển thị tối đa 6 từ gần nhất trên thẻ chính
        int count = 0;
        List<Map.Entry<String, String>> entryList = new ArrayList<>(masterGlossary.entrySet());
        Collections.reverse(entryList);
        for (Map.Entry<String, String> entry : entryList) {
            if (count >= 6) break;
            count++;

            LinearLayout row = new LinearLayout(this);
            row.setOrientation(LinearLayout.HORIZONTAL);
            row.setPadding(16, 12, 16, 12);
            row.setBackgroundColor(Color.parseColor("#171717"));
            row.setGravity(Gravity.CENTER_VERTICAL);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, 0, 0, 6);
            row.setLayoutParams(lp);

            TextView tvPair = new TextView(this);
            tvPair.setText(entry.getKey() + " ➔ " + entry.getValue());
            tvPair.setTextColor(Color.parseColor("#34D399"));
            tvPair.setTextSize(12);
            row.addView(tvPair, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

            Button btnEdit = createButton("Sửa", "#1E293B");
            btnEdit.setOnClickListener(v -> showEditGlossaryDialog(entry.getKey(), entry.getValue()));
            row.addView(btnEdit);

            View sp = new View(this);
            row.addView(sp, new LinearLayout.LayoutParams(6, 1));

            Button btnDel = createButton("✕", "#7F1D1D");
            btnDel.setOnClickListener(v -> {
                masterGlossary.remove(entry.getKey());
                refreshGlossaryList();
            });
            row.addView(btnDel);

            llGlossaryList.addView(row);
        }

        // Nút mở kho từ điển toàn diện (Full Dialog có tìm kiếm, không làm giật màn hình)
        Button btnViewAll = createButton("📖 Mở Kho Từ Điển Đầy Đủ (" + masterGlossary.size() + " từ) ▾", "#1E293B");
        btnViewAll.setOnClickListener(v -> showFullGlossaryDialog());
        llGlossaryList.addView(btnViewAll);
    }

    private void showFullGlossaryDialog() {
        androidx.appcompat.app.AlertDialog.Builder builder = new androidx.appcompat.app.AlertDialog.Builder(this);
        builder.setTitle("Kho Từ Điển Master Glossary (" + masterGlossary.size() + " từ)");

        LinearLayout dialogLayout = new LinearLayout(this);
        dialogLayout.setOrientation(LinearLayout.VERTICAL);
        dialogLayout.setPadding(24, 16, 24, 16);

        final EditText edtSearch = createStyledEditText("Tìm kiếm từ gốc hoặc nghĩa dịch...");
        dialogLayout.addView(edtSearch);

        // Action Toolbar in Dialog
        LinearLayout toolbarRow = new LinearLayout(this);
        toolbarRow.setOrientation(LinearLayout.HORIZONTAL);
        toolbarRow.setPadding(0, 10, 0, 10);

        Button btnImportFull = createButton("📥 Nạp File .txt", "#1D4ED8");
        btnImportFull.setOnClickListener(v -> openGlossaryFilePicker());
        toolbarRow.addView(btnImportFull, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

        View sp1 = new View(this);
        toolbarRow.addView(sp1, new LinearLayout.LayoutParams(8, 1));

        Button btnExportFull = createButton("📤 Xuất .txt", "#374151");
        btnExportFull.setOnClickListener(v -> exportGlossaryData());
        toolbarRow.addView(btnExportFull);

        dialogLayout.addView(toolbarRow);

        ScrollView sv = new ScrollView(this);
        final LinearLayout itemsLayout = new LinearLayout(this);
        itemsLayout.setOrientation(LinearLayout.VERTICAL);
        itemsLayout.setPadding(0, 10, 0, 10);

        final Runnable populate = () -> {
            itemsLayout.removeAllViews();
            String query = edtSearch.getText().toString().trim().toLowerCase();
            for (Map.Entry<String, String> entry : masterGlossary.entrySet()) {
                if (query.isEmpty() || entry.getKey().toLowerCase().contains(query) || entry.getValue().toLowerCase().contains(query)) {
                    LinearLayout row = new LinearLayout(this);
                    row.setOrientation(LinearLayout.HORIZONTAL);
                    row.setPadding(16, 10, 16, 10);
                    row.setBackgroundColor(Color.parseColor("#171717"));
                    row.setGravity(Gravity.CENTER_VERTICAL);
                    LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
                    lp.setMargins(0, 0, 0, 6);
                    row.setLayoutParams(lp);

                    TextView tvPair = new TextView(this);
                    tvPair.setText(entry.getKey() + " ➔ " + entry.getValue());
                    tvPair.setTextColor(Color.parseColor("#34D399"));
                    tvPair.setTextSize(13);
                    row.addView(tvPair, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

                    Button btnEdit = createButton("Sửa", "#1E293B");
                    btnEdit.setOnClickListener(v -> showEditGlossaryDialog(entry.getKey(), entry.getValue()));
                    row.addView(btnEdit);

                    View spd = new View(this);
                    row.addView(spd, new LinearLayout.LayoutParams(6, 1));

                    Button btnDel = createButton("✕", "#7F1D1D");
                    btnDel.setOnClickListener(v -> {
                        masterGlossary.remove(entry.getKey());
                        saveCurrentProjectData();
                        refreshGlossaryList();
                        row.setVisibility(View.GONE);
                    });
                    row.addView(btnDel);

                    itemsLayout.addView(row);
                }
            }
        };

        edtSearch.addTextChangedListener(new android.text.TextWatcher() {
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            public void onTextChanged(CharSequence s, int start, int before, int count) { populate.run(); }
            public void afterTextChanged(android.text.Editable s) {}
        });

        populate.run();
        sv.addView(itemsLayout);
        dialogLayout.addView(sv, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 800));

        builder.setView(dialogLayout);
        builder.setPositiveButton("Đóng", null);
        builder.show();
    }

    private void startRangeTranslation() {
        if (rawChapters.isEmpty()) {
            Toast.makeText(this, "Vui lòng nạp và tách chương trước!", Toast.LENGTH_SHORT).show();
            return;
        }

        try {
            rangeFromChap = Integer.parseInt(edtFromChap.getText().toString().trim());
            rangeToChap = Integer.parseInt(edtToChap.getText().toString().trim());
        } catch (Exception e) {
            rangeFromChap = 1;
            rangeToChap = rawChapters.size();
        }

        rangeFromChap = Math.max(1, Math.min(rangeFromChap, rawChapters.size()));
        rangeToChap = Math.max(rangeFromChap, Math.min(rangeToChap, rawChapters.size()));

        currentChapterIdx = rangeFromChap - 1;
        isTranslating = true;
        isPaused = false;
        btnPauseResume.setText("Tạm dừng");

        // Bật Foreground Service
        Intent serviceIntent = new Intent(this, TranslationForegroundService.class);
        serviceIntent.putExtra("INFO", "Đang dịch nền từ Chương " + rangeFromChap + " đến " + rangeToChap);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent);
        } else {
            startService(serviceIntent);
        }

        appendLog("▶ Bắt đầu dịch Range: Chương " + rangeFromChap + " ➔ " + rangeToChap + "...");
        startTranslationLoop();
    }

    private void togglePauseResume() {
        if (!isTranslating) return;
        isPaused = !isPaused;
        btnPauseResume.setText(isPaused ? "Tiếp tục" : "Tạm dừng");
        if (isPaused) {
            appendLog("⏸ Đã tạm dừng tại Chương " + (currentChapterIdx + 1) + " (Chương này chưa hoàn tất).");
            Toast.makeText(this, "Đã tạm dừng dịch tại Chương " + (currentChapterIdx + 1), Toast.LENGTH_SHORT).show();
        } else {
            appendLog("▶ Tiếp tục dịch lại Chương " + (currentChapterIdx + 1) + " (chương đang dở dang)...");
            Toast.makeText(this, "Tiếp tục dịch Chương " + (currentChapterIdx + 1), Toast.LENGTH_SHORT).show();
        }
    }

    private void cancelTranslation() {
        isTranslating = false;
        isPaused = false;
        btnPauseResume.setText("Tạm dừng");
        stopService(new Intent(this, TranslationForegroundService.class));
        appendLog("⏹ Đã hủy tiến trình dịch.");
        Toast.makeText(this, "Đã hủy tiến trình dịch.", Toast.LENGTH_SHORT).show();
    }

    private void startTranslationLoop() {
        new Thread(() -> {
            while (isTranslating && currentChapterIdx < rangeToChap && currentChapterIdx < rawChapters.size()) {
                if (isPaused) {
                    try { Thread.sleep(500); } catch (Exception ignored) {}
                    continue;
                }

                final int chapIndex = currentChapterIdx;
                appendLog("⚡ Đang gửi Chương " + (chapIndex + 1) + " đến " + currentModel + "...");

                try {
                    String activePrompt = "Dịch tiểu thuyết mượt mà";
                    for (PromptCardItem p : promptCards) {
                        if (p.active) { activePrompt = p.content; break; }
                    }

                    // Tự động trích xuất 300-350 ký tự cuối của bản dịch chương trước để bắt nhịp ngữ cảnh
                    String prevSnippet = null;
                    if (chapIndex > 0 && translatedChapters.containsKey(chapIndex - 1)) {
                        String prevTrans = translatedChapters.get(chapIndex - 1);
                        if (prevTrans != null && !prevTrans.trim().isEmpty()) {
                            int takeLen = Math.min(prevTrans.length(), 350);
                            prevSnippet = "..." + prevTrans.substring(prevTrans.length() - takeLen).trim();
                        }
                    }

                    String[] result = engine.translateChapter(
                            rawChapters.get(chapIndex),
                            prevSnippet,
                            activePrompt,
                            masterGlossary,
                            currentModel,
                            targetLanguage,
                            antiHanziStrict,
                            minTermLength,
                            minFrequency,
                            msg -> mainHandler.post(() -> appendLog(msg))
                    );

                    String translatedText = result[0];
                    // Lớp 2: Hậu kiểm Regex chống lọt chữ Hán cho bản dịch tiếng Việt
                    if (targetLanguage.contains("Việt") && antiHanziStrict) {
                        for (Map.Entry<String, String> gEntry : masterGlossary.entrySet()) {
                            if (translatedText.contains(gEntry.getKey())) {
                                translatedText = translatedText.replace(gEntry.getKey(), gEntry.getValue());
                            }
                        }
                    }

                    translatedChapters.put(chapIndex, translatedText);

                    // Bóc tách thuật ngữ mới tuân thủ minTermLength, minFrequency và conflictPolicy
                    List<GlossaryManager.GlossaryEntry> newlyAdded = new ArrayList<>();
                    if (result.length > 1 && result[1] != null && !result[1].trim().isEmpty()) {
                        newlyAdded = GlossaryManager.mergeNewEntries(masterGlossary, result[1], rawChapters.get(chapIndex), minTermLength, minFrequency, conflictPolicy);
                    }

                    saveCurrentProjectData(); // Lưu bền vững vào ổ nhớ ngay lập tức sau mỗi chương!

                    final List<GlossaryManager.GlossaryEntry> finalAdded = newlyAdded;
                    mainHandler.post(() -> {
                        updateProgressUI();
                        refreshGlossaryList(); // TỰ ĐỘNG CẬP NHẬT GIAO DIỆN GLOSSARY THỜI GIAN THỰC!
                        refreshChapterListView();

                        if (!finalAdded.isEmpty()) {
                            StringBuilder sb = new StringBuilder("📚 Đã tự học " + finalAdded.size() + " từ mới: ");
                            for (GlossaryManager.GlossaryEntry e : finalAdded) {
                                sb.append("[").append(e.key).append(" ➔ ").append(e.value).append("] ");
                            }
                            appendLog(sb.toString());
                            Toast.makeText(MainActivity.this, "Đã nạp thêm " + finalAdded.size() + " từ mới vào Glossary!", Toast.LENGTH_SHORT).show();
                        }

                        appendLog("✅ Hoàn tất Chương " + (chapIndex + 1));
                    });

                    currentChapterIdx++;
                    Thread.sleep(delaySec * 1000L);
                } catch (Exception e) {
                    mainHandler.post(() -> appendLog("❌ Lỗi chương " + (chapIndex + 1) + ": " + e.getMessage()));
                    try { Thread.sleep(4000); } catch (Exception ignored) {}
                }
            }

            mainHandler.post(() -> {
                if (currentChapterIdx >= rangeToChap) {
                    isTranslating = false;
                    appendLog("🎉 Đã hoàn thành khoảng chương yêu cầu!");
                    Toast.makeText(MainActivity.this, "Đã hoàn thành dịch khoảng chương!", Toast.LENGTH_LONG).show();
                }
            });
        }).start();
    }

    private void updateProgressUI() {
        if (progressBar != null) {
            progressBar.setMax(Math.max(rawChapters.size(), 1));
            progressBar.setProgress(translatedChapters.size());
            tvProgressText.setText("Tiến độ: " + translatedChapters.size() + " / " + rawChapters.size() + " chương");
        }
    }

    private void appendLog(String msg) {
        mainHandler.post(() -> {
            String time = new java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault()).format(new java.util.Date());
            logList.add(0, "[" + time + "] " + msg);
            if (logList.size() > 50) logList.removeLast();

            if (tvLiveLogs != null) {
                String nl = String.valueOf((char) 10);
                StringBuilder sb = new StringBuilder();
                for (String l : logList) {
                    sb.append(l).append(nl);
                }
                tvLiveLogs.setText(sb.toString());
            }
        });
    }

    // =========================================================================
    // THẺ 3: BẢN DỊCH & DANH SÁCH CHƯƠNG (PHÂN TRANG MƯỢT MÀ 60FPS)
    // =========================================================================
    private void createTabReaderView() {
        tabReaderView = new ScrollView(this);
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(32, 24, 32, 32);

        tvChapterCountInfo = new TextView(this);
        tvChapterCountInfo.setTextColor(Color.parseColor("#60A5FA"));
        tvChapterCountInfo.setTextSize(14);
        tvChapterCountInfo.setTypeface(null, Typeface.BOLD);
        tvChapterCountInfo.setText("Danh Sách Các Chương (Chạm để mở Trình Đọc Toàn Màn Hình):");
        content.addView(tvChapterCountInfo);

        TextView tvDesc = new TextView(this);
        tvDesc.setText("Phân trang 100 chương/trang chống khựng máy. Trạng thái đọc độc lập 100%, hỗ trợ AMOLED/Sepia.");
        tvDesc.setTextColor(Color.parseColor("#9CA3AF"));
        tvDesc.setTextSize(11);
        tvDesc.setPadding(0, 4, 0, 12);
        content.addView(tvDesc);

        Button btnExportTab3 = createButton("📥 Xuất Toàn Văn Tác Phẩm (.txt) Vào Download", "#059669");
        btnExportTab3.setOnClickListener(v -> exportFullNovelData());
        content.addView(btnExportTab3);

        View spExp = new View(this);
        content.addView(spExp, new LinearLayout.LayoutParams(1, 14));

        llChapterList = new LinearLayout(this);
        llChapterList.setOrientation(LinearLayout.VERTICAL);
        content.addView(llChapterList);

        tabReaderView.addView(content);
        refreshChapterListView();
    }

    private void refreshChapterListView() {
        if (llChapterList == null) return;
        llChapterList.removeAllViews();

        if (rawChapters.isEmpty()) {
            TextView tvEmpty = new TextView(this);
            tvEmpty.setText("Chưa có chương nào. Hãy nạp file ở Thẻ 2 (Dịch & Từ điển)!");
            tvEmpty.setTextColor(Color.parseColor("#666666"));
            tvEmpty.setPadding(0, 32, 0, 0);
            llChapterList.addView(tvEmpty);
            return;
        }

        int totalChapters = rawChapters.size();
        int totalPages = Math.max(1, (int) Math.ceil((double) totalChapters / CHAPTERS_PER_PAGE));
        chapterListPage = Math.max(0, Math.min(chapterListPage, totalPages - 1));

        // Hàng điều khiển phân trang chương chống giật lag
        LinearLayout pagRow = new LinearLayout(this);
        pagRow.setOrientation(LinearLayout.HORIZONTAL);
        pagRow.setPadding(0, 0, 0, 16);
        pagRow.setGravity(Gravity.CENTER_VERTICAL);

        Button btnPrevPage = createButton("◀ Trước", "#1E293B");
        btnPrevPage.setEnabled(chapterListPage > 0);
        btnPrevPage.setOnClickListener(v -> {
            if (chapterListPage > 0) {
                chapterListPage--;
                refreshChapterListView();
            }
        });
        pagRow.addView(btnPrevPage);

        TextView tvPageInfo = new TextView(this);
        tvPageInfo.setGravity(Gravity.CENTER);
        tvPageInfo.setTextColor(Color.parseColor("#93C5FD"));
        tvPageInfo.setText("Trang " + (chapterListPage + 1) + " / " + totalPages + " (" + totalChapters + " chương)");
        pagRow.addView(tvPageInfo, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

        Button btnNextPage = createButton("Sau ▶", "#1E293B");
        btnNextPage.setEnabled(chapterListPage < totalPages - 1);
        btnNextPage.setOnClickListener(v -> {
            if (chapterListPage < totalPages - 1) {
                chapterListPage++;
                refreshChapterListView();
            }
        });
        pagRow.addView(btnNextPage);
        llChapterList.addView(pagRow);

        int startIdx = chapterListPage * CHAPTERS_PER_PAGE;
        int endIdx = Math.min(startIdx + CHAPTERS_PER_PAGE, totalChapters);

        for (int i = startIdx; i < endIdx; i++) {
            final int idx = i;
            boolean isDone = translatedChapters.containsKey(idx);
            boolean isCurrent = isTranslating && currentChapterIdx == idx;

            LinearLayout item = new LinearLayout(this);
            item.setOrientation(LinearLayout.HORIZONTAL);
            GradientDrawable itemBg = new GradientDrawable();
            itemBg.setColor(Color.parseColor(isCurrent ? "#172554" : (isDone ? "#064E3B" : "#161B22")));
            itemBg.setCornerRadius(18f);
            itemBg.setStroke(2, Color.parseColor(isCurrent ? "#3B82F6" : (isDone ? "#059669" : "#30363D")));
            item.setBackground(itemBg);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, 0, 0, 8);
            item.setLayoutParams(lp);

            TextView tvName = new TextView(this);
            String nl = String.valueOf((char) 10);
            String firstLine = rawChapters.get(idx).split(nl)[0];
            tvName.setText("Chương " + (idx + 1) + ": " + (firstLine.length() > 30 ? firstLine.substring(0, 30) : firstLine));
            tvName.setTextColor(Color.WHITE);
            item.addView(tvName, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

            TextView tvStatus = new TextView(this);
            tvStatus.setText(isCurrent ? "⚡ Đang dịch" : (isDone ? "✓ Đã dịch" : "Chờ"));
            tvStatus.setTextColor(Color.parseColor(isCurrent ? "#93C5FD" : (isDone ? "#34D399" : "#6B7280")));
            tvStatus.setTypeface(null, Typeface.BOLD);
            item.addView(tvStatus);

            item.setOnClickListener(v -> openFullScreenReader(idx));
            llChapterList.addView(item);
        }
    }

    // =========================================================================
    // TRÌNH ĐỌC TOÀN MÀN HÌNH CHUYÊN NGHIỆP (FULLSCREEN READER OVERLAY)
    // =========================================================================
    private void createFullScreenReaderOverlay() {
        flReaderOverlay = new FrameLayout(this);
        flReaderOverlay.setVisibility(View.GONE);

        llReaderRoot = new LinearLayout(this);
        llReaderRoot.setOrientation(LinearLayout.VERTICAL);

        // 1. Reader Top Bar
        LinearLayout topBar = new LinearLayout(this);
        topBar.setOrientation(LinearLayout.HORIZONTAL);
        topBar.setPadding(28, 20, 28, 20);
        topBar.setGravity(Gravity.CENTER_VERTICAL);

        tvReaderTitle = new TextView(this);
        tvReaderTitle.setText("Chương 1");
        tvReaderTitle.setTextSize(15);
        tvReaderTitle.setTypeface(null, Typeface.BOLD);
        topBar.addView(tvReaderTitle, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

        Button btnCopy = createButton("Sao chép", "#1E293B");
        btnCopy.setOnClickListener(v -> {
            String textToCopy = getReaderCurrentText();
            ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            if (cm != null) {
                cm.setPrimaryClip(ClipData.newPlainText("Chapter Text", textToCopy));
                Toast.makeText(this, "Đã sao chép chương!", Toast.LENGTH_SHORT).show();
            }
        });
        topBar.addView(btnCopy);

        View spClose = new View(this);
        topBar.addView(spClose, new LinearLayout.LayoutParams(8, 1));

        Button btnClose = createButton("✕ Đóng", "#7F1D1D");
        btnClose.setOnClickListener(v -> flReaderOverlay.setVisibility(View.GONE));
        topBar.addView(btnClose);

        llReaderRoot.addView(topBar);

        // 2. Reader Secondary Toolbar (View Mode, Theme, Font Size)
        LinearLayout toolbar = new LinearLayout(this);
        toolbar.setOrientation(LinearLayout.HORIZONTAL);
        toolbar.setPadding(28, 10, 28, 10);
        toolbar.setGravity(Gravity.CENTER_VERTICAL);

        // Chế độ xem: Tiếng Việt, Song Ngữ, Gốc
        btnModeTrans = createButton("Tiếng Việt", "#2563EB");
        btnModeTrans.setOnClickListener(v -> {
            readerMode = "translated";
            updateReaderUI();
        });
        toolbar.addView(btnModeTrans);

        View sm1 = new View(this);
        toolbar.addView(sm1, new LinearLayout.LayoutParams(6, 1));

        btnModeBilingual = createButton("Song Ngữ", "#1E293B");
        btnModeBilingual.setOnClickListener(v -> {
            readerMode = "bilingual";
            updateReaderUI();
        });
        toolbar.addView(btnModeBilingual);

        View sm2 = new View(this);
        toolbar.addView(sm2, new LinearLayout.LayoutParams(6, 1));

        btnModeRaw = createButton("Nguyên Tác", "#1E293B");
        btnModeRaw.setOnClickListener(v -> {
            readerMode = "original";
            updateReaderUI();
        });
        toolbar.addView(btnModeRaw);

        View sSpace = new View(this);
        toolbar.addView(sSpace, new LinearLayout.LayoutParams(0, 1, 1.0f));

        // Chủ đề: AMOLED, Sepia, Sáng
        btnThemeAmoled = createButton("AMOLED", "#000000");
        btnThemeAmoled.setOnClickListener(v -> {
            readerTheme = "amoled";
            applyReaderTheme();
        });
        toolbar.addView(btnThemeAmoled);

        View st1 = new View(this);
        toolbar.addView(st1, new LinearLayout.LayoutParams(6, 1));

        btnThemeSepia = createButton("Sepia", "#D97706");
        btnThemeSepia.setOnClickListener(v -> {
            readerTheme = "sepia";
            applyReaderTheme();
        });
        toolbar.addView(btnThemeSepia);

        View st2 = new View(this);
        toolbar.addView(st2, new LinearLayout.LayoutParams(6, 1));

        btnThemeLight = createButton("Sáng", "#4B5563");
        btnThemeLight.setOnClickListener(v -> {
            readerTheme = "light";
            applyReaderTheme();
        });
        toolbar.addView(btnThemeLight);

        View sFontSpace = new View(this);
        toolbar.addView(sFontSpace, new LinearLayout.LayoutParams(12, 1));

        // Nút chỉnh cỡ chữ
        Button btnFontMinus = createButton("A-", "#1E293B");
        btnFontMinus.setOnClickListener(v -> {
            readerFontSize = Math.max(12, readerFontSize - 1);
            tvFontSizeDisplay.setText(readerFontSize + "sp");
            tvReaderContent.setTextSize(readerFontSize);
        });
        toolbar.addView(btnFontMinus);

        tvFontSizeDisplay = new TextView(this);
        tvFontSizeDisplay.setText(readerFontSize + "sp");
        tvFontSizeDisplay.setTextSize(11);
        tvFontSizeDisplay.setPadding(8, 0, 8, 0);
        toolbar.addView(tvFontSizeDisplay);

        Button btnFontPlus = createButton("A+", "#1E293B");
        btnFontPlus.setOnClickListener(v -> {
            readerFontSize = Math.min(26, readerFontSize + 1);
            tvFontSizeDisplay.setText(readerFontSize + "sp");
            tvReaderContent.setTextSize(readerFontSize);
        });
        toolbar.addView(btnFontPlus);

        llReaderRoot.addView(toolbar);

        // 3. Reader Content Body
        svReaderScroll = new ScrollView(this);
        LinearLayout.LayoutParams svParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1.0f
        );

        tvReaderContent = new TextView(this);
        tvReaderContent.setPadding(36, 24, 36, 32);
        tvReaderContent.setTextSize(readerFontSize);
        tvReaderContent.setLineSpacing(0, 1.6f);
        tvReaderContent.setTextIsSelectable(true);

        svReaderScroll.addView(tvReaderContent);
        llReaderRoot.addView(svReaderScroll, svParams);

        // 4. Reader Bottom Bar (Chương Trước / Sau)
        LinearLayout bottomBar = new LinearLayout(this);
        bottomBar.setOrientation(LinearLayout.HORIZONTAL);
        bottomBar.setPadding(28, 16, 28, 20);
        bottomBar.setGravity(Gravity.CENTER_VERTICAL);

        btnPrevChapter = createButton("← Chương Trước", "#1E293B");
        btnPrevChapter.setOnClickListener(v -> {
            if (readerCurrentChapterIndex > 0) {
                openFullScreenReader(readerCurrentChapterIndex - 1);
            }
        });
        bottomBar.addView(btnPrevChapter);

        tvReaderSubTitle = new TextView(this);
        tvReaderSubTitle.setGravity(Gravity.CENTER);
        bottomBar.addView(tvReaderSubTitle, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

        btnNextChapter = createButton("Chương Sau →", "#1E293B");
        btnNextChapter.setOnClickListener(v -> {
            if (readerCurrentChapterIndex < rawChapters.size() - 1) {
                openFullScreenReader(readerCurrentChapterIndex + 1);
            }
        });
        bottomBar.addView(btnNextChapter);

        llReaderRoot.addView(bottomBar);

        flReaderOverlay.addView(llReaderRoot, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        applyReaderTheme();
    }

    private void openFullScreenReader(int index) {
        if (rawChapters.isEmpty()) return;
        readerCurrentChapterIndex = Math.max(0, Math.min(index, rawChapters.size() - 1));

        tvReaderTitle.setText(currentProjectName + " · Chương " + (readerCurrentChapterIndex + 1) + " / " + rawChapters.size());
        tvReaderSubTitle.setText((readerCurrentChapterIndex + 1) + " / " + rawChapters.size());

        btnPrevChapter.setEnabled(readerCurrentChapterIndex > 0);
        btnNextChapter.setEnabled(readerCurrentChapterIndex < rawChapters.size() - 1);

        updateReaderUI();

        flReaderOverlay.setVisibility(View.VISIBLE);
        svReaderScroll.scrollTo(0, 0);
    }

    private String getReaderCurrentText() {
        if (rawChapters.isEmpty() || readerCurrentChapterIndex >= rawChapters.size()) return "";

        String nl = String.valueOf((char) 10);
        boolean hasTrans = translatedChapters.containsKey(readerCurrentChapterIndex);
        String transText = hasTrans ? translatedChapters.get(readerCurrentChapterIndex) : "(Chưa có bản dịch cho chương này)";
        String rawText = rawChapters.get(readerCurrentChapterIndex);

        if ("translated".equals(readerMode)) {
            return transText;
        } else if ("original".equals(readerMode)) {
            return rawText;
        } else {
            return "=== BẢN DỊCH TIẾNG VIỆT ===" + nl + nl + transText + nl + nl + "=== NGUYÊN TÁC GỐC ===" + nl + nl + rawText;
        }
    }

    private void updateReaderUI() {
        tvReaderContent.setText(getReaderCurrentText());

        btnModeTrans.setBackgroundColor(Color.parseColor("translated".equals(readerMode) ? "#2563EB" : "#1E293B"));
        btnModeBilingual.setBackgroundColor(Color.parseColor("bilingual".equals(readerMode) ? "#2563EB" : "#1E293B"));
        btnModeRaw.setBackgroundColor(Color.parseColor("original".equals(readerMode) ? "#2563EB" : "#1E293B"));
    }

    private void applyReaderTheme() {
        int bgColor;
        int textColor;
        int barBgColor;

        if ("sepia".equals(readerTheme)) {
            bgColor = Color.parseColor("#FBF0D9");
            textColor = Color.parseColor("#3D2E1E");
            barBgColor = Color.parseColor("#F2E2C2");
        } else if ("light".equals(readerTheme)) {
            bgColor = Color.parseColor("#FFFFFF");
            textColor = Color.parseColor("#111827");
            barBgColor = Color.parseColor("#F3F4F6");
        } else { // amoled
            bgColor = Color.parseColor("#000000");
            textColor = Color.parseColor("#E5E7EB");
            barBgColor = Color.parseColor("#111111");
        }

        llReaderRoot.setBackgroundColor(bgColor);
        tvReaderContent.setTextColor(textColor);
        tvReaderTitle.setTextColor(textColor);
        tvReaderSubTitle.setTextColor(textColor);
        tvFontSizeDisplay.setTextColor(textColor);
    }

    // =========================================================================
    // =========================================================================
    // THẺ 4: CÀI ĐẶT CHUYÊN SÂU & QUẢN LÝ DỰ ÁN (DEEP SETTINGS HUB)
    // =========================================================================
    private void refreshSettingsUI() {
        if (tvSettingsProjName != null) {
            tvSettingsProjName.setText("• Dự án: " + currentProjectName);
        }
        if (tvSettingsProjStats != null) {
            tvSettingsProjStats.setText("• Đã dịch: " + translatedChapters.size() + "/" + rawChapters.size() + " chương · Glossary: " + masterGlossary.size() + " từ");
        }
        if (tvSettingsMinTerm != null) {
            tvSettingsMinTerm.setText("• Độ dài chữ Hán tối thiểu: " + minTermLength + " ký tự");
        }
        if (edtCustomMinTerm != null && !edtCustomMinTerm.hasFocus()) {
            edtCustomMinTerm.setText(String.valueOf(minTermLength));
        }
        if (tvSettingsMinFreq != null) {
            tvSettingsMinFreq.setText("• Tần suất lặp lại tối thiểu trong chương: ≥ " + minFrequency + " lần");
        }
        if (edtCustomMinFreq != null && !edtCustomMinFreq.hasFocus()) {
            edtCustomMinFreq.setText(String.valueOf(minFrequency));
        }
        if (tvSettingsTargetLang != null) {
            tvSettingsTargetLang.setText("• Ngôn ngữ đích: " + targetLanguage);
        }

        updateLangButtonStyles();
        updateMinTermButtonStyles();
        updateMinFreqButtonStyles();

        if (btnSettingsAntiHanzi != null) {
            btnSettingsAntiHanzi.setText("Bộ Lọc 2 Lớp Chống Chữ Hán: " + (antiHanziStrict ? "BẬT [Lớp 1 + Lớp 2]" : "TẮT"));
            btnSettingsAntiHanzi.setBackground(createButtonDrawable(antiHanziStrict ? "#059669" : "#374151", 18f));
        }
        if (btnSettingsPolicy != null) {
            btnSettingsPolicy.setText("Xung Đột Nghĩa: " + ("keep-old".equals(conflictPolicy) ? "Giữ Cũ - Bỏ Mới (Bảo toàn)" : "Ghi Đè Bằng Nghĩa Mới"));
        }
    }

    private void updateLangButtonStyles() {
        if (btnLangVi == null) return;
        boolean isVi = targetLanguage.contains("Việt");
        boolean isJa = targetLanguage.contains("Nhật") || targetLanguage.contains("日本語");
        boolean isEn = targetLanguage.equalsIgnoreCase("English");
        boolean isKo = targetLanguage.contains("Hàn") || targetLanguage.contains("한국어");

        btnLangVi.setBackground(createButtonDrawable(isVi ? "#2563EB" : "#1E293B", 18f));
        btnLangJa.setBackground(createButtonDrawable(isJa ? "#2563EB" : "#1E293B", 18f));
        btnLangEn.setBackground(createButtonDrawable(isEn ? "#2563EB" : "#1E293B", 18f));
        btnLangKo.setBackground(createButtonDrawable(isKo ? "#2563EB" : "#1E293B", 18f));
    }

    private void updateMinTermButtonStyles() {
        for (int i = 0; i < minTermButtons.size(); i++) {
            int len = i + 1;
            Button b = minTermButtons.get(i);
            b.setBackground(createButtonDrawable(minTermLength == len ? "#059669" : "#1E293B", 18f));
        }
    }

    private void updateMinFreqButtonStyles() {
        for (int i = 0; i < minFreqButtons.size(); i++) {
            int freq = i + 1;
            Button b = minFreqButtons.get(i);
            b.setBackground(createButtonDrawable(minFrequency == freq ? "#059669" : "#1E293B", 18f));
        }
    }

    private void createTabSettingsView() {
        tabSettingsView = new ScrollView(this);
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(32, 24, 32, 32);

        // 1. Quản Lý Dự Án & Xóa Dự Án
        TextView tvProjTitle = new TextView(this);
        tvProjTitle.setText("1. Quản Lý Dự Án Hiện Tại:");
        tvProjTitle.setTextColor(Color.WHITE);
        tvProjTitle.setTextSize(15);
        tvProjTitle.setTypeface(null, Typeface.BOLD);
        content.addView(tvProjTitle);

        LinearLayout cardProj = createCard();
        tvSettingsProjName = new TextView(this);
        tvSettingsProjName.setText("• Dự án: " + currentProjectName);
        tvSettingsProjName.setTextColor(Color.parseColor("#93C5FD"));
        tvSettingsProjName.setTypeface(null, Typeface.BOLD);
        cardProj.addView(tvSettingsProjName);

        tvSettingsProjStats = new TextView(this);
        tvSettingsProjStats.setText("• Đã dịch: " + translatedChapters.size() + "/" + rawChapters.size() + " chương · Glossary: " + masterGlossary.size() + " từ");
        tvSettingsProjStats.setTextColor(Color.parseColor("#9CA3AF"));
        tvSettingsProjStats.setPadding(0, 4, 0, 12);
        cardProj.addView(tvSettingsProjStats);

        LinearLayout rowProjBtns = new LinearLayout(this);
        rowProjBtns.setOrientation(LinearLayout.HORIZONTAL);

        Button btnSwitch = createButton("Chuyển Dự Án", "#1E293B");
        btnSwitch.setOnClickListener(v -> showSwitchProjectDialog());
        rowProjBtns.addView(btnSwitch, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

        View sp1 = new View(this);
        rowProjBtns.addView(sp1, new LinearLayout.LayoutParams(12, 1));

        Button btnNewProj = createButton("+ Tạo Mới", "#2563EB");
        btnNewProj.setOnClickListener(v -> showNewProjectDialog());
        rowProjBtns.addView(btnNewProj, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

        cardProj.addView(rowProjBtns);

        // Nút Xóa Dự Án Màu Đỏ Cực Kỳ An Toàn
        Button btnDeleteProj = createButton("🗑️ Xóa Vĩnh Viễn Dự Án Này", "#7F1D1D");
        btnDeleteProj.setOnClickListener(v -> showDeleteProjectConfirmationDialog());
        LinearLayout.LayoutParams lpDel = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lpDel.setMargins(0, 10, 0, 0);
        cardProj.addView(btnDeleteProj, lpDel);

        TextView tvDelHint = new TextView(this);
        tvDelHint.setText("💡 Khi xóa dự án, chỉ dữ liệu của truyện này bị xóa. Toàn bộ kho Key API và Thẻ Prompt ở Tab 1 được BẢO TOÀN VĨNH CỬU 100%.");
        tvDelHint.setTextColor(Color.parseColor("#6B7280"));
        tvDelHint.setTextSize(10);
        tvDelHint.setPadding(0, 8, 0, 0);
        cardProj.addView(tvDelHint);

        content.addView(cardProj);

        // 2. Tinh Chỉnh Glossary AI Auto-Learning
        TextView tvGlossSettingsTitle = new TextView(this);
        tvGlossSettingsTitle.setText("2. Tinh Chỉnh Thuật Ngữ Glossary (AI Auto-Learning):");
        tvGlossSettingsTitle.setTextColor(Color.WHITE);
        tvGlossSettingsTitle.setTextSize(15);
        tvGlossSettingsTitle.setTypeface(null, Typeface.BOLD);
        tvGlossSettingsTitle.setPadding(0, 16, 0, 0);
        content.addView(tvGlossSettingsTitle);

        LinearLayout cardGloss = createCard();
        tvSettingsMinTerm = new TextView(this);
        tvSettingsMinTerm.setText("• Độ dài chữ Hán tối thiểu: " + minTermLength + " ký tự");
        tvSettingsMinTerm.setTextColor(Color.parseColor("#D1D5DB"));
        cardGloss.addView(tvSettingsMinTerm);

        // Quick buttons cho Độ dài
        minTermButtons.clear();
        LinearLayout rowLen = new LinearLayout(this);
        rowLen.setOrientation(LinearLayout.HORIZONTAL);
        rowLen.setPadding(0, 8, 0, 8);
        for (int l = 1; l <= 5; l++) {
            final int chosenLen = l;
            Button b = createButton(l + " kt", minTermLength == l ? "#059669" : "#1E293B");
            b.setOnClickListener(v -> {
                minTermLength = chosenLen;
                saveAllState();
                refreshSettingsUI();
                appendLog("⚙️ Đã đặt Độ dài Glossary tối thiểu: >= " + chosenLen + " ký tự");
            });
            minTermButtons.add(b);
            rowLen.addView(b, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));
            if (l < 5) {
                View s = new View(this);
                rowLen.addView(s, new LinearLayout.LayoutParams(6, 1));
            }
        }
        cardGloss.addView(rowLen);

        // Nhập số tùy ý cho Độ dài
        LinearLayout rowCustomMinTerm = new LinearLayout(this);
        rowCustomMinTerm.setOrientation(LinearLayout.HORIZONTAL);
        rowCustomMinTerm.setGravity(Gravity.CENTER_VERTICAL);
        rowCustomMinTerm.setPadding(0, 0, 0, 14);

        TextView tvCustomTermLabel = new TextView(this);
        tvCustomTermLabel.setText("Hoặc nhập số tùy ý:");
        tvCustomTermLabel.setTextColor(Color.parseColor("#9CA3AF"));
        tvCustomTermLabel.setTextSize(12);
        rowCustomMinTerm.addView(tvCustomTermLabel);

        View sct1 = new View(this);
        rowCustomMinTerm.addView(sct1, new LinearLayout.LayoutParams(10, 1));

        edtCustomMinTerm = new EditText(this);
        edtCustomMinTerm.setInputType(android.text.InputType.TYPE_CLASS_NUMBER);
        edtCustomMinTerm.setText(String.valueOf(minTermLength));
        edtCustomMinTerm.setTextColor(Color.WHITE);
        edtCustomMinTerm.setBackgroundColor(Color.parseColor("#171717"));
        edtCustomMinTerm.setPadding(20, 12, 20, 12);
        edtCustomMinTerm.setGravity(Gravity.CENTER);
        rowCustomMinTerm.addView(edtCustomMinTerm, new LinearLayout.LayoutParams(140, ViewGroup.LayoutParams.WRAP_CONTENT));

        View sct2 = new View(this);
        rowCustomMinTerm.addView(sct2, new LinearLayout.LayoutParams(10, 1));

        Button btnSaveCustomTerm = createButton("Lưu số này", "#059669");
        btnSaveCustomTerm.setOnClickListener(v -> {
            try {
                int val = Integer.parseInt(edtCustomMinTerm.getText().toString().trim());
                if (val >= 1) {
                    minTermLength = val;
                    saveAllState();
                    refreshSettingsUI();
                    appendLog("⚙️ Đã lưu Độ dài Glossary tối thiểu: >= " + minTermLength + " ký tự");
                    Toast.makeText(this, "Đã lưu độ dài tối thiểu: " + minTermLength + " ký tự!", Toast.LENGTH_SHORT).show();
                } else {
                    Toast.makeText(this, "Vui lòng nhập số >= 1!", Toast.LENGTH_SHORT).show();
                }
            } catch (Exception e) {
                Toast.makeText(this, "Vui lòng nhập số hợp lệ!", Toast.LENGTH_SHORT).show();
            }
        });
        rowCustomMinTerm.addView(btnSaveCustomTerm);
        cardGloss.addView(rowCustomMinTerm);

        // Tần suất xuất hiện tối thiểu
        tvSettingsMinFreq = new TextView(this);
        tvSettingsMinFreq.setText("• Tần suất lặp lại tối thiểu trong chương: ≥ " + minFrequency + " lần");
        tvSettingsMinFreq.setTextColor(Color.parseColor("#D1D5DB"));
        cardGloss.addView(tvSettingsMinFreq);

        minFreqButtons.clear();
        LinearLayout rowFreq = new LinearLayout(this);
        rowFreq.setOrientation(LinearLayout.HORIZONTAL);
        rowFreq.setPadding(0, 8, 0, 8);
        for (int f = 1; f <= 5; f++) {
            final int chosenFreq = f;
            Button b = createButton("≥ " + f + " lần", minFrequency == f ? "#059669" : "#1E293B");
            b.setOnClickListener(v -> {
                minFrequency = chosenFreq;
                saveAllState();
                refreshSettingsUI();
                appendLog("⚙️ Đã đặt Tần suất Glossary tối thiểu: >= " + chosenFreq + " lần");
            });
            minFreqButtons.add(b);
            rowFreq.addView(b, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));
            if (f < 5) {
                View s = new View(this);
                rowFreq.addView(s, new LinearLayout.LayoutParams(6, 1));
            }
        }
        cardGloss.addView(rowFreq);

        // Nhập số tùy ý cho Tần suất
        LinearLayout rowCustomMinFreq = new LinearLayout(this);
        rowCustomMinFreq.setOrientation(LinearLayout.HORIZONTAL);
        rowCustomMinFreq.setGravity(Gravity.CENTER_VERTICAL);
        rowCustomMinFreq.setPadding(0, 0, 0, 14);

        TextView tvCustomFreqLabel = new TextView(this);
        tvCustomFreqLabel.setText("Hoặc nhập số tùy ý:");
        tvCustomFreqLabel.setTextColor(Color.parseColor("#9CA3AF"));
        tvCustomFreqLabel.setTextSize(12);
        rowCustomMinFreq.addView(tvCustomFreqLabel);

        View scf1 = new View(this);
        rowCustomMinFreq.addView(scf1, new LinearLayout.LayoutParams(10, 1));

        edtCustomMinFreq = new EditText(this);
        edtCustomMinFreq.setInputType(android.text.InputType.TYPE_CLASS_NUMBER);
        edtCustomMinFreq.setText(String.valueOf(minFrequency));
        edtCustomMinFreq.setTextColor(Color.WHITE);
        edtCustomMinFreq.setBackgroundColor(Color.parseColor("#171717"));
        edtCustomMinFreq.setPadding(20, 12, 20, 12);
        edtCustomMinFreq.setGravity(Gravity.CENTER);
        rowCustomMinFreq.addView(edtCustomMinFreq, new LinearLayout.LayoutParams(140, ViewGroup.LayoutParams.WRAP_CONTENT));

        View scf2 = new View(this);
        rowCustomMinFreq.addView(scf2, new LinearLayout.LayoutParams(10, 1));

        Button btnSaveCustomFreq = createButton("Lưu số này", "#059669");
        btnSaveCustomFreq.setOnClickListener(v -> {
            try {
                int val = Integer.parseInt(edtCustomMinFreq.getText().toString().trim());
                if (val >= 1) {
                    minFrequency = val;
                    saveAllState();
                    refreshSettingsUI();
                    appendLog("⚙️ Đã lưu Tần suất Glossary tối thiểu: >= " + minFrequency + " lần");
                    Toast.makeText(this, "Đã lưu tần suất tối thiểu: " + minFrequency + " lần!", Toast.LENGTH_SHORT).show();
                } else {
                    Toast.makeText(this, "Vui lòng nhập số >= 1!", Toast.LENGTH_SHORT).show();
                }
            } catch (Exception e) {
                Toast.makeText(this, "Vui lòng nhập số hợp lệ!", Toast.LENGTH_SHORT).show();
            }
        });
        rowCustomMinFreq.addView(btnSaveCustomFreq);
        cardGloss.addView(rowCustomMinFreq);

        btnSettingsPolicy = createButton("Xung Đột Nghĩa: " + ("keep-old".equals(conflictPolicy) ? "Giữ Cũ - Bỏ Mới (Bảo toàn)" : "Ghi Đè Bằng Nghĩa Mới"), "#1E293B");
        btnSettingsPolicy.setOnClickListener(v -> {
            conflictPolicy = "keep-old".equals(conflictPolicy) ? "overwrite" : "keep-old";
            saveAllState();
            refreshSettingsUI();
            appendLog("⚙️ Đã chuyển chính sách xung đột: " + conflictPolicy);
        });
        cardGloss.addView(btnSettingsPolicy);

        content.addView(cardGloss);

        // 3. Dịch Thuật & Chống Lọt Chữ Hán
        TextView tvTransTitle = new TextView(this);
        tvTransTitle.setText("3. Dịch Thuật & Chống Lọt Chữ Hán (2 Lớp):");
        tvTransTitle.setTextColor(Color.WHITE);
        tvTransTitle.setTextSize(15);
        tvTransTitle.setTypeface(null, Typeface.BOLD);
        tvTransTitle.setPadding(0, 16, 0, 0);
        content.addView(tvTransTitle);

        LinearLayout cardTrans = createCard();
        tvSettingsTargetLang = new TextView(this);
        tvSettingsTargetLang.setText("• Ngôn ngữ đích: " + targetLanguage);
        tvSettingsTargetLang.setTextColor(Color.parseColor("#93C5FD"));
        cardTrans.addView(tvSettingsTargetLang);

        LinearLayout rowLangs = new LinearLayout(this);
        rowLangs.setOrientation(LinearLayout.HORIZONTAL);
        rowLangs.setPadding(0, 8, 0, 12);

        btnLangVi = createButton("Tiếng Việt", targetLanguage.contains("Việt") ? "#2563EB" : "#1E293B");
        btnLangVi.setOnClickListener(v -> {
            targetLanguage = "Tiếng Việt";
            saveAllState();
            refreshSettingsUI();
            appendLog("⚙️ Ngôn ngữ đích: Tiếng Việt (Kích hoạt bộ lọc cấm chữ Hán)");
            Toast.makeText(this, "Đã chọn ngôn ngữ đích: Tiếng Việt", Toast.LENGTH_SHORT).show();
        });
        rowLangs.addView(btnLangVi, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

        View spL1 = new View(this);
        rowLangs.addView(spL1, new LinearLayout.LayoutParams(6, 1));

        btnLangJa = createButton("日本語", targetLanguage.contains("Nhật") || targetLanguage.contains("日本語") ? "#2563EB" : "#1E293B");
        btnLangJa.setOnClickListener(v -> {
            targetLanguage = "日本語";
            saveAllState();
            refreshSettingsUI();
            appendLog("⚙️ Ngôn ngữ đích: 日本語 (Thả lỏng cho phép sinh Kanji mượt mà)");
            Toast.makeText(this, "Đã chọn ngôn ngữ đích: 日本語 (Tiếng Nhật)", Toast.LENGTH_SHORT).show();
        });
        rowLangs.addView(btnLangJa, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

        View spL2 = new View(this);
        rowLangs.addView(spL2, new LinearLayout.LayoutParams(6, 1));

        btnLangEn = createButton("English", targetLanguage.equalsIgnoreCase("English") ? "#2563EB" : "#1E293B");
        btnLangEn.setOnClickListener(v -> {
            targetLanguage = "English";
            saveAllState();
            refreshSettingsUI();
            appendLog("⚙️ Ngôn ngữ đích: English");
            Toast.makeText(this, "Đã chọn ngôn ngữ đích: English", Toast.LENGTH_SHORT).show();
        });
        rowLangs.addView(btnLangEn, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

        View spL3 = new View(this);
        rowLangs.addView(spL3, new LinearLayout.LayoutParams(6, 1));

        btnLangKo = createButton("한국어", targetLanguage.contains("한국어") || targetLanguage.contains("Hàn") ? "#2563EB" : "#1E293B");
        btnLangKo.setOnClickListener(v -> {
            targetLanguage = "한국어";
            saveAllState();
            refreshSettingsUI();
            appendLog("⚙️ Ngôn ngữ đích: 한국어");
            Toast.makeText(this, "Đã chọn ngôn ngữ đích: 한국어", Toast.LENGTH_SHORT).show();
        });
        rowLangs.addView(btnLangKo, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f));

        cardTrans.addView(rowLangs);

        btnSettingsAntiHanzi = createButton("Bộ Lọc 2 Lớp Chống Chữ Hán: " + (antiHanziStrict ? "BẬT [Lớp 1 + Lớp 2]" : "TẮT"), antiHanziStrict ? "#059669" : "#374151");
        btnSettingsAntiHanzi.setOnClickListener(v -> {
            antiHanziStrict = !antiHanziStrict;
            saveAllState();
            refreshSettingsUI();
            appendLog("⚙️ Bộ lọc chống lọt chữ Hán: " + (antiHanziStrict ? "BẬT" : "TẮT"));
        });
        cardTrans.addView(btnSettingsAntiHanzi);

        content.addView(cardTrans);

        // 4. Trạng Thái 5 Tầng Chạy Ngầm (God-Mode)
        TextView tvTitle = new TextView(this);
        tvTitle.setText("4. Trạng Thái 5 Tầng Chạy Ngầm (God-Mode):");
        tvTitle.setTextColor(Color.WHITE);
        tvTitle.setTextSize(15);
        tvTitle.setTypeface(null, Typeface.BOLD);
        tvTitle.setPadding(0, 16, 0, 0);
        content.addView(tvTitle);

        LinearLayout cardStatus = createCard();
        cardStatus.addView(createStatusRow("1. Foreground Service (DataSync)", "KÍCH HOẠT"));
        cardStatus.addView(createStatusRow("2. CPU Partial WakeLock (12 Giờ)", "KÍCH HOẠT"));
        cardStatus.addView(createStatusRow("3. Bỏ Qua Tối Ưu Hóa Pin", "KÍCH HOẠT"));
        cardStatus.addView(createStatusRow("4. WorkManager Periodic Watchdog", "KÍCH HOẠT"));
        cardStatus.addView(createStatusRow("5. Root Mode (OOM Score -1000)", RootController.isRootAvailable() ? "BẤT TỬ (ROOT #)" : "CHƯA CẤP ROOT"));
        content.addView(cardStatus);

        // Tinh chỉnh tốc độ dịch
        TextView tvDelayTitle = new TextView(this);
        tvDelayTitle.setText("Độ trễ an toàn giữa các chương (giây):");
        tvDelayTitle.setTextColor(Color.WHITE);
        tvDelayTitle.setPadding(0, 16, 0, 8);
        content.addView(tvDelayTitle);

        EditText edtDelay = new EditText(this);
        edtDelay.setText(String.valueOf(delaySec));
        edtDelay.setTextColor(Color.WHITE);
        edtDelay.setBackgroundColor(Color.parseColor("#171717"));
        edtDelay.setPadding(16, 12, 16, 12);
        content.addView(edtDelay);

        Button btnSaveDelay = createButton("Lưu Độ Trễ", "#1E293B");
        btnSaveDelay.setOnClickListener(v -> {
            try {
                delaySec = Math.max(1, Integer.parseInt(edtDelay.getText().toString().trim()));
                saveAllState();
                Toast.makeText(this, "Đã lưu độ trễ: " + delaySec + "s", Toast.LENGTH_SHORT).show();
            } catch (Exception ignored) {}
        });
        content.addView(btnSaveDelay);

        // Xuất toàn văn tác phẩm
        Button btnExport = createButton("📥 Xuất Toàn Văn Tác Phẩm (.txt)", "#059669");
        btnExport.setOnClickListener(v -> exportFullNovelData());
        content.addView(btnExport);

        tabSettingsView.addView(content);
    }

    private void exportFullNovelData() {
        if (translatedChapters.isEmpty()) {
            Toast.makeText(this, "Chưa có chương nào được dịch để xuất!", Toast.LENGTH_SHORT).show();
            return;
        }

        String nl = String.valueOf((char) 10);
        StringBuilder sb = new StringBuilder();
        sb.append("=== TOÀN VĂN TÁC PHẨM: ").append(currentProjectName).append(" ===").append(nl);
        sb.append("Biên dịch bởi: DroidTranslator God-Mode").append(nl);
        sb.append("Mô hình: ").append(currentModel).append(nl);
        sb.append("Tổng số chương đã dịch: ").append(translatedChapters.size()).append(nl).append(nl);

        List<Integer> keys = new ArrayList<>(translatedChapters.keySet());
        Collections.sort(keys);
        for (Integer idx : keys) {
            sb.append("============================================================").append(nl);
            sb.append(translatedChapters.get(idx)).append(nl).append(nl);
        }

        String fullText = sb.toString();
        try {
            java.io.File downloadDir = android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS);
            if (!downloadDir.exists()) downloadDir.mkdirs();
            java.io.File outFile = new java.io.File(downloadDir, currentProjectName + "_FULL_TRANSLATED.txt");
            java.io.FileOutputStream fos = new java.io.FileOutputStream(outFile);
            fos.write(fullText.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            fos.flush();
            fos.close();

            ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            if (cm != null) {
                cm.setPrimaryClip(ClipData.newPlainText("Full Novel", fullText));
            }

            appendLog("📁 Đã lưu file tổng tại: " + outFile.getAbsolutePath());
            Toast.makeText(this, "✅ Đã lưu file thành công tại thư mục Download!" + nl + "Tên file: " + outFile.getName(), Toast.LENGTH_LONG).show();

            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType("text/plain");
            shareIntent.putExtra(Intent.EXTRA_SUBJECT, currentProjectName + " - Bản Dịch Hoàn Chỉnh");
            shareIntent.putExtra(Intent.EXTRA_TEXT, fullText.length() > 50000 ? fullText.substring(0, 50000) + nl + nl + "... [Đã lưu toàn bộ file tại thư mục Download]" : fullText);
            startActivity(Intent.createChooser(shareIntent, "Chia sẻ hoặc Mở File Toàn Văn"));
        } catch (Exception e) {
            ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            if (cm != null) {
                cm.setPrimaryClip(ClipData.newPlainText("Full Novel", fullText));
            }
            appendLog("📋 Đã sao chép toàn bộ " + translatedChapters.size() + " chương vào Clipboard.");
            Toast.makeText(this, "Đã sao chép toàn văn " + translatedChapters.size() + " chương vào Clipboard!", Toast.LENGTH_LONG).show();
        }
    }

    private TextView createStatusRow(String name, String status) {
        TextView tv = new TextView(this);
        tv.setText("• " + name + ": [" + status + "]");
        tv.setTextColor(Color.parseColor("#34D399"));
        tv.setTypeface(null, Typeface.BOLD);
        tv.setPadding(0, 8, 0, 8);
        return tv;
    }

    private GradientDrawable createCardDrawable() {
        GradientDrawable gd = new GradientDrawable();
        gd.setColor(Color.parseColor("#161B22"));
        gd.setCornerRadius(24f);
        gd.setStroke(2, Color.parseColor("#30363D"));
        return gd;
    }

    private GradientDrawable createButtonDrawable(String hexColor, float radius) {
        GradientDrawable gd = new GradientDrawable();
        gd.setColor(Color.parseColor(hexColor));
        gd.setCornerRadius(radius);
        return gd;
    }

    private GradientDrawable createInputDrawable() {
        GradientDrawable gd = new GradientDrawable();
        gd.setColor(Color.parseColor("#0D1117"));
        gd.setCornerRadius(18f);
        gd.setStroke(2, Color.parseColor("#30363D"));
        return gd;
    }

    private GradientDrawable createBadgeDrawable(String hexBg, String hexStroke) {
        GradientDrawable gd = new GradientDrawable();
        gd.setColor(Color.parseColor(hexBg));
        gd.setCornerRadius(30f);
        if (hexStroke != null) {
            gd.setStroke(2, Color.parseColor(hexStroke));
        }
        return gd;
    }

    private LinearLayout createCard() {
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        l.setPadding(28, 24, 28, 24);
        l.setBackground(createCardDrawable());
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.setMargins(0, 0, 0, 18);
        l.setLayoutParams(lp);
        return l;
    }

    private Button createButton(String text, String colorHex) {
        Button b = new Button(this);
        b.setText(text);
        b.setTextColor(Color.WHITE);
        b.setTextSize(12);
        b.setTypeface(null, Typeface.BOLD);
        b.setBackground(createButtonDrawable(colorHex, 18f));
        b.setPadding(20, 12, 20, 12);
        b.setStateListAnimator(null);
        return b;
    }

    private EditText createStyledEditText(String hint) {
        EditText edt = new EditText(this);
        edt.setHint(hint);
        edt.setHintTextColor(Color.parseColor("#6B7280"));
        edt.setTextColor(Color.WHITE);
        edt.setBackground(createInputDrawable());
        edt.setPadding(20, 14, 20, 14);
        edt.setTextSize(13);
        return edt;
    }
}
