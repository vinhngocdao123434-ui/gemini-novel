package com.droidtranslator.app;

import java.util.*;

public class GlossaryManager {

    public static class GlossaryEntry {
        public String key;
        public String value;

        public GlossaryEntry(String key, String value) {
            this.key = key;
            this.value = value;
        }
    }

    public static int countChineseChars(String str) {
        if (str == null) return 0;
        int count = 0;
        for (char c : str.toCharArray()) {
            if (c >= 0x4E00 && c <= 0x9FA5) count++;
        }
        return count;
    }

    public static int countOccurrences(String text, String term) {
        if (text == null || term == null || term.isEmpty()) return 0;
        int count = 0;
        int pos = 0;
        while ((pos = text.indexOf(term, pos)) != -1) {
            count++;
            pos += term.length();
        }
        return count;
    }

    public static GlossaryEntry parseLine(String line, String chapterRawText, int minTermLength, int minFrequency) {
        if (line == null) return null;
        String trimmed = line.trim();
        if (trimmed.isEmpty() || trimmed.startsWith("#") || trimmed.startsWith("//")) return null;
        if (trimmed.equalsIgnoreCase("none") || trimmed.toLowerCase().contains("không có")) return null;

        String[] parts = null;
        if (trimmed.contains("=")) {
            parts = trimmed.split("=", 2);
        } else if (trimmed.contains("➔")) {
            parts = trimmed.split("➔", 2);
        } else if (trimmed.contains("->")) {
            parts = trimmed.split("->", 2);
        } else if (trimmed.contains(":")) {
            parts = trimmed.split(":", 2);
        }

        if (parts != null && parts.length == 2) {
            String raw = cleanTerm(parts[0]);
            String val = cleanTerm(parts[1]);
            if (!raw.isEmpty() && !val.isEmpty()) {
                // 1. CHỐNG ĐẢO NGƯỢC: Nếu val chứa chữ Hán còn raw không chứa chữ Hán -> tự động hoán đổi lại đúng vị trí!
                int chineseInRaw = countChineseChars(raw);
                int chineseInVal = countChineseChars(val);
                if (chineseInVal > 0 && chineseInRaw == 0) {
                    String temp = raw;
                    raw = val;
                    val = temp;
                }

                // 2. LỌC ĐỘ DÀI: Tuân thủ cài đặt minTermLength (mặc định: >= 2 ký tự chữ Hán)
                int finalChineseCount = countChineseChars(raw);
                if (finalChineseCount < (minTermLength > 0 ? minTermLength : 2)) return null;

                // 3. ĐIỀU KIỆN TẦN SUẤT: Phải xuất hiện từ minFrequency lần trở lên trong văn bản gốc
                if (chapterRawText != null && !chapterRawText.isEmpty()) {
                    int occ = countOccurrences(chapterRawText, raw);
                    if (occ < (minFrequency > 0 ? minFrequency : 2)) return null;
                }

                return new GlossaryEntry(raw, val);
            }
        }
        return null;
    }

    public static GlossaryEntry parseLine(String line, String chapterRawText) {
        return parseLine(line, chapterRawText, 2, 2);
    }

    public static GlossaryEntry parseLine(String line) {
        return parseLine(line, null, 2, 2);
    }

    public static String cleanTerm(String str) {
        if (str == null) return "";
        return str.replace(String.valueOf((char) 34), "")
                .replace(String.valueOf((char) 39), "")
                .replace(String.valueOf((char) 96), "")
                .replace("‘", "")
                .replace("“", "")
                .replace("”", "")
                .replace("’", "")
                .replace("*", "")
                .replace("-", "")
                .replace("•", "")
                .replace("【", "")
                .replace("】", "")
                .replace("[", "")
                .replace("]", "")
                .trim();
    }

    public static List<GlossaryEntry> mergeNewEntries(Map<String, String> targetMap, String newGlossaryBlock, String chapterRawText, int minTermLength, int minFrequency, String conflictPolicy) {
        List<GlossaryEntry> addedList = new ArrayList<>();
        if (targetMap == null || newGlossaryBlock == null || newGlossaryBlock.trim().isEmpty()) {
            return addedList;
        }
        String nl = String.valueOf((char) 10);
        String[] lines = newGlossaryBlock.split(nl);
        for (String line : lines) {
            GlossaryEntry entry = parseLine(line, chapterRawText, minTermLength, minFrequency);
            if (entry != null && !entry.key.isEmpty() && !entry.value.isEmpty()) {
                if ("overwrite".equals(conflictPolicy) || !targetMap.containsKey(entry.key)) {
                    targetMap.put(entry.key, entry.value);
                    addedList.add(entry);
                }
            }
        }
        return addedList;
    }

    public static List<GlossaryEntry> mergeNewEntries(Map<String, String> targetMap, String newGlossaryBlock, String chapterRawText) {
        return mergeNewEntries(targetMap, newGlossaryBlock, chapterRawText, 2, 2, "keep-old");
    }

    public static List<GlossaryEntry> mergeNewEntries(Map<String, String> targetMap, String newGlossaryBlock) {
        return mergeNewEntries(targetMap, newGlossaryBlock, null, 2, 2, "keep-old");
    }

    public static String getGlossaryAsString(Map<String, String> map) {
        if (map == null || map.isEmpty()) {
            return "";
        }
        String nl = String.valueOf((char) 10);
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String> entry : map.entrySet()) {
            sb.append(entry.getKey()).append(" = ").append(entry.getValue()).append(nl);
        }
        return sb.toString();
    }
}
