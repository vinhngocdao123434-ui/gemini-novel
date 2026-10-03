package com.droidtranslator.app;

import com.droidtranslator.app.model.ApiKeyItem;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import okhttp3.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

public class GeminiEngine {

    private final List<ApiKeyItem> keys;
    private final OkHttpClient client;
    private final Gson gson;
    private int currentKeyIndex = 0;

    public interface LogCallback {
        void onLog(String message);
    }

    public GeminiEngine(List<ApiKeyItem> keys) {
        this.keys = keys;
        this.client = new OkHttpClient.Builder()
                .connectTimeout(45, TimeUnit.SECONDS)
                .readTimeout(120, TimeUnit.SECONDS)
                .writeTimeout(45, TimeUnit.SECONDS)
                .build();
        this.gson = new Gson();
    }

    private synchronized ApiKeyItem getNextAvailableKey() {
        if (keys == null || keys.isEmpty()) return null;
        long now = System.currentTimeMillis();

        for (int i = 0; i < keys.size(); i++) {
            int idx = (currentKeyIndex + i) % keys.size();
            ApiKeyItem item = keys.get(idx);
            if ("ACTIVE".equals(item.state) && item.cooldownUntil <= now) {
                currentKeyIndex = (idx + 1) % keys.size();
                return item;
            }
        }
        return keys.get(0);
    }

    public boolean testKey(ApiKeyItem item) {
        try {
            String testUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + item.key;
            JsonObject pingObj = new JsonObject();
            JsonArray pingContents = new JsonArray();
            JsonObject pingPartObj = new JsonObject();
            JsonArray pingParts = new JsonArray();
            JsonObject textObj = new JsonObject();
            textObj.addProperty("text", "ping");
            pingParts.add(textObj);
            pingPartObj.add("parts", pingParts);
            pingContents.add(pingPartObj);
            pingObj.add("contents", pingContents);
            String bodyJson = pingObj.toString();

            RequestBody body = RequestBody.create(bodyJson, MediaType.parse("application/json"));
            Request request = new Request.Builder().url(testUrl).post(body).build();

            Response response = client.newCall(request).execute();
            if (response.isSuccessful()) {
                item.state = "ACTIVE";
                item.cooldownUntil = 0;
                return true;
            } else {
                item.state = "ERROR (" + response.code() + ")";
                return false;
            }
        } catch (Exception e) {
            item.state = "FAIL";
            return false;
        }
    }

    public String[] translateChapter(String chapterText, String previousChapterSnippet, String systemPrompt, Map<String, String> glossary, String modelName, String targetLanguage, boolean antiHanziStrict, int minTermLength, int minFrequency, LogCallback logger) throws Exception {
        int maxRetries = Math.max(keys.size() * 2, 4);
        int attempts = 0;

        while (attempts < maxRetries) {
            attempts++;
            ApiKeyItem keyItem = getNextAvailableKey();
            if (keyItem == null) {
                throw new Exception("Không có API Key nào trong kho lưu trữ!");
            }

            long now = System.currentTimeMillis();
            if (keyItem.cooldownUntil > now) {
                long waitSec = Math.max((keyItem.cooldownUntil - now) / 1000, 1);
                if (logger != null) logger.onLog("⏳ Tất cả Key đang cooldown, chờ " + waitSec + "s...");
                Thread.sleep(waitSec * 1000);
            }

            try {
                keyItem.totalRequests++;
                String glossaryText = GlossaryManager.getGlossaryAsString(glossary);
                String nl = String.valueOf((char) 10);

                StringBuilder promptSb = new StringBuilder();
                promptSb.append("Bạn là chuyên gia dịch thuật tiểu thuyết hàng đầu thế giới.").append(nl).append(nl);
                promptSb.append("[NGÔN NGỮ ĐÍCH]: ").append(targetLanguage != null ? targetLanguage : "Tiếng Việt").append(nl).append(nl);
                promptSb.append("[YÊU CẦU DỊCH THUẬT]:").append(nl).append(systemPrompt).append(nl).append(nl);
                promptSb.append("[BẢNG TỪ ĐIỂN GLOSSARY BẮT BUỘC TUÂN THỦ]:").append(nl);
                promptSb.append(glossaryText.isEmpty() ? "(Chưa có, hãy tự trích xuất từ mới bên dưới)" : glossaryText).append(nl).append(nl);

                if (previousChapterSnippet != null && !previousChapterSnippet.trim().isEmpty()) {
                    promptSb.append("[NGỮ CẢNH ĐOẠN CUỐI CHƯƠNG TRƯỚC (CHỈ DÙNG ĐỂ THAM KHẢO NGỮ CẢNH VÀ ĐỒNG NHẤT XƯNG HÔ, TUYỆT ĐỐI KHÔNG DỊCH LẠI VÀ TUYỆT ĐỐI KHÔNG TRÍCH XUẤT TỪ MỚI TỪ ĐÂY)]:").append(nl);
                    promptSb.append(previousChapterSnippet.trim()).append(nl).append(nl);
                }

                promptSb.append("[VĂN BẢN GỐC CHƯƠNG HIỆN TẠI (CHỈ DỊCH VÀ BÓC TÁCH TỪ ĐÂY)]:").append(nl).append(chapterText).append(nl).append(nl);

                boolean isViet = (targetLanguage == null || targetLanguage.toLowerCase().contains("việt"));
                boolean isJap = (targetLanguage != null && (targetLanguage.toLowerCase().contains("nhật") || targetLanguage.toLowerCase().contains("japan")));

                if (isViet && antiHanziStrict) {
                    promptSb.append("[QUY TẮC BẮT BUỘC - CHỐNG LỌT CHỮ HÁN CHO TIẾNG VIỆT]:").append(nl);
                    promptSb.append("- TUYỆT ĐỐI KHÔNG để sót bất kỳ ký tự chữ Hán (Hanzi) nào trong phần [TRANSLATION] tiếng Việt (100% chữ Hán phải được dịch nghĩa hoặc phiên âm Hán-Việt chuẩn).").append(nl);
                    promptSb.append("- TUYỆT ĐỐI KHÔNG trộn lẫn nửa chữ Hán nửa tiếng Việt trong một danh từ riêng (ví dụ: '林辰' phải dịch là 'Lâm Thần', cấm viết '林 Thần').").append(nl);
                    promptSb.append("- TUYỆT ĐỐI KHÔNG gõ sai lỗi bộ gõ Telex (ví dụ: 'Đangk' là lỗi gõ thừa phím k của 'Đăng').").append(nl);
                    promptSb.append("- Tuân thủ triệt để bảng Glossary gửi kèm để đồng nhất tên nhân vật.").append(nl).append(nl);
                } else if (isJap) {
                    promptSb.append("[TARGET JAPANESE]: Translate fluently into natural Japanese, seamlessly incorporating Kanji, Hiragana, and Katakana.").append(nl).append(nl);
                }

                promptSb.append("[QUY TẮC ĐẦU RA BẮT BUỘC]:").append(nl);
                promptSb.append("===TRANSLATION===").append(nl);
                promptSb.append("(Toàn bộ bản dịch trôi chảy)").append(nl);
                promptSb.append("===NEW_GLOSSARY===").append(nl);
                promptSb.append("(Chỉ trích xuất các DANH TỪ RIÊNG [tên nhân vật, tông môn, địa danh, công pháp, bảo vật] MỚI xuất hiện trong chương hiện tại CHƯA CÓ trong Glossary gửi kèm.").append(nl);
                promptSb.append("QUY TẮC NGHIÊM NGẶT:").append(nl);
                promptSb.append("1. ĐỘ DÀI: Bắt buộc từ ").append(minTermLength > 0 ? minTermLength : 2).append(" ký tự chữ Hán trở lên. TUYỆT ĐỐI KHÔNG thêm từ 1 ký tự và KHÔNG thêm từ vựng thông dụng.").append(nl);
                promptSb.append("2. TẦN SUẤT: Tên riêng đó BẮT BUỘC phải xuất hiện từ ").append(minFrequency > 0 ? minFrequency : 2).append(" lần trở lên trong văn bản gốc chương này.").append(nl);
                promptSb.append("3. ĐỊNH DẠNG: Mỗi dòng định dạng chuẩn: [TừGốc] = [NghĩaDịch]. TUYỆT ĐỐI KHÔNG ĐẢO NGƯỢC THỨ TỰ)").append(nl);

                JsonObject root = new JsonObject();
                JsonArray contents = new JsonArray();
                JsonObject contentObj = new JsonObject();
                JsonArray parts = new JsonArray();
                JsonObject partObj = new JsonObject();
                partObj.addProperty("text", promptSb.toString());
                parts.add(partObj);
                contentObj.add("parts", parts);
                contents.add(contentObj);
                root.add("contents", contents);

                JsonObject genConfig = new JsonObject();
                genConfig.addProperty("temperature", 0.3);
                root.add("generationConfig", genConfig);

                String actualModel = (modelName != null && !modelName.trim().isEmpty()) ? modelName.trim() : "gemini-2.5-flash";
                String url = "https://generativelanguage.googleapis.com/v1beta/models/" + actualModel + ":generateContent?key=" + keyItem.key;

                RequestBody requestBody = RequestBody.create(root.toString(), MediaType.parse("application/json"));
                Request request = new Request.Builder().url(url).post(requestBody).build();

                Response response = client.newCall(request).execute();
                String respBody = response.body() != null ? response.body().string() : "";

                if (response.isSuccessful()) {
                    keyItem.successRequests++;
                    keyItem.state = "ACTIVE";

                    JsonObject respJson = gson.fromJson(respBody, JsonObject.class);
                    JsonArray candidates = respJson.getAsJsonArray("candidates");
                    if (candidates != null && candidates.size() > 0) {
                        JsonObject firstCand = candidates.get(0).getAsJsonObject();
                        JsonObject content = firstCand.getAsJsonObject("content");
                        JsonArray outParts = content.getAsJsonArray("parts");
                        String outText = outParts.get(0).getAsJsonObject().get("text").getAsString();

                        return parseOutput(outText);
                    } else {
                        throw new Exception("Không nhận được nội dung từ Gemini.");
                    }
                } else {
                    if (response.code() == 429) {
                        keyItem.state = "COOLDOWN";
                        keyItem.cooldownUntil = System.currentTimeMillis() + 60000;
                        if (logger != null) logger.onLog("⚠️ Key ..." + keyItem.key.substring(Math.max(0, keyItem.key.length() - 6)) + " bị rate limit (429). Đổi Key tiếp theo!");
                    } else {
                        if (logger != null) logger.onLog("⚠️ Lỗi HTTP " + response.code() + ": " + response.message());
                    }
                }
            } catch (Exception e) {
                if (logger != null) logger.onLog("⚠️ Ngoại lệ: " + e.getMessage());
                Thread.sleep(2000);
            }
        }

        throw new Exception("Quá số lần thử lại tối đa (" + maxRetries + ").");
    }

    public String[] translateChapter(String chapterText, String previousChapterSnippet, String systemPrompt, Map<String, String> glossary, String modelName, LogCallback logger) throws Exception {
        return translateChapter(chapterText, previousChapterSnippet, systemPrompt, glossary, modelName, "Tiếng Việt", true, 2, 2, logger);
    }

    private String[] parseOutput(String text) {
        if (text == null || text.trim().isEmpty()) {
            return new String[]{"", ""};
        }

        String translation = text;
        String newGlossary = "";

        // Dùng regex tìm mốc phân tách bất chấp markdown **, ## hoặc khoảng trắng
        java.util.regex.Pattern transPattern = java.util.regex.Pattern.compile("(?i)[#*]*[ \t\n\r]*===+[ \t\n\r]*TRANSLATION[ \t\n\r]*===+[#*]*");
        java.util.regex.Pattern glossPattern = java.util.regex.Pattern.compile("(?i)[#*]*[ \t\n\r]*===+[ \t\n\r]*NEW_GLOSSARY[ \t\n\r]*===+[#*]*");

        java.util.regex.Matcher mTrans = transPattern.matcher(text);
        java.util.regex.Matcher mGloss = glossPattern.matcher(text);

        int transStart = -1;
        if (mTrans.find()) {
            transStart = mTrans.end();
        }

        int glossStart = -1;
        if (mGloss.find()) {
            glossStart = mGloss.start();
            int glossContentStart = mGloss.end();
            newGlossary = text.substring(glossContentStart).trim();
        }

        if (transStart != -1) {
            if (glossStart != -1 && glossStart > transStart) {
                translation = text.substring(transStart, glossStart).trim();
            } else {
                translation = text.substring(transStart).trim();
            }
        } else if (glossStart != -1) {
            translation = text.substring(0, glossStart).trim();
        } else {
            translation = text.trim();
        }

        // Làm sạch codeblock nếu Gemini bọc ngoài
        if (translation.startsWith("```")) {
            int firstNl = translation.indexOf((char) 10);
            if (firstNl != -1) translation = translation.substring(firstNl + 1);
            if (translation.endsWith("```")) {
                translation = translation.substring(0, translation.length() - 3).trim();
            }
        }
        if (newGlossary.startsWith("```")) {
            int firstNl = newGlossary.indexOf((char) 10);
            if (firstNl != -1) newGlossary = newGlossary.substring(firstNl + 1);
            if (newGlossary.endsWith("```")) {
                newGlossary = newGlossary.substring(0, newGlossary.length() - 3).trim();
            }
        }

        // Khử lỗi telex gõ sai (như Xa Đangk Khoa -> Xa Đăng Khoa)
        translation = translation.replaceAll("(?i)\\b([A-Za-zÀ-ỹ]+)ngk\\b", "$1ng")
                                 .replaceAll("(?i)\\b([A-Za-zÀ-ỹ]+)awk\\b", "$1ă")
                                 .replaceAll("(?i)\\b([A-Za-zÀ-ỹ]+)owk\\b", "$1ơ")
                                 .replaceAll("(?i)\\b([A-Za-zÀ-ỹ]+)uwk\\b", "$1ư");

        return new String[]{translation.trim(), newGlossary.trim()};
    }
}
