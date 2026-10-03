import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/app_models.dart';

class GeminiService {
  final List<ApiKeyItem> apiKeys;
  int _currentKeyIndex = 0;

  GeminiService(this.apiKeys);

  ApiKeyItem? getNextAvailableKey() {
    if (apiKeys.isEmpty) return null;
    final now = DateTime.now().millisecondsSinceEpoch;

    for (int i = 0; i < apiKeys.length; i++) {
      final idx = (_currentKeyIndex + i) % apiKeys.length;
      final k = apiKeys[idx];

      if (k.state == 'COOLDOWN' && now >= k.cooldownUntil) {
        k.state = 'ACTIVE';
      }

      if (k.state == 'ACTIVE') {
        _currentKeyIndex = (idx + 1) % apiKeys.length;
        return k;
      }
    }
    return null;
  }

  void markKeyCooldown(ApiKeyItem keyItem, int seconds) {
    keyItem.state = 'COOLDOWN';
    keyItem.cooldownUntil = DateTime.now().millisecondsSinceEpoch + (seconds * 1000);
  }

  /// Dịch một chương tiểu thuyết kèm trích xuất Glossary tự động
  Future<List<String>> translateChapter({
    required String rawText,
    String? prevSnippet,
    required String systemPrompt,
    required Map<String, String> masterGlossary,
    required String modelName,
    required String targetLanguage,
    required bool antiHanzi,
    required Function(String log, String type) onLog,
  }) async {
    const maxRetries = 3;
    int attempt = 0;

    while (attempt < maxRetries) {
      attempt++;
      final keyItem = getNextAvailableKey();
      if (keyItem == null) {
        throw Exception('Toàn bộ API Key trong Pool đều đang bị giới hạn hoặc làm mát!');
      }

      keyItem.totalRequests++;

      // Chuẩn bị prompt
      final glossaryList = masterGlossary.entries
          .map((e) => '- ${e.key} => ${e.value}')
          .join('\n');

      final promptBuffer = StringBuffer();
      promptBuffer.writeln(systemPrompt);
      promptBuffer.writeln('\nNgôn ngữ đích: $targetLanguage.');
      if (antiHanzi) {
        promptBuffer.writeln('BẮT BUỘC: Không để sót bất kỳ chữ Hán nào. Tên riêng dịch âm Hán-Việt.');
      }
      if (glossaryList.isNotEmpty) {
        promptBuffer.writeln('\nBẢNG TỪ ĐIỂN ĐÃ CÓ (BẮT BUỘC TUÂN THỦ 100%):');
        promptBuffer.writeln(glossaryList);
      }
      if (prevSnippet != null && prevSnippet.isNotEmpty) {
        promptBuffer.writeln('\nĐoạn văn kết thúc của chương trước (để giữ mạch văn liên tục):');
        promptBuffer.writeln(prevSnippet);
      }

      promptBuffer.writeln('\n[NỘI DUNG CHƯƠNG CẦN DỊCH]:\n$rawText');
      promptBuffer.writeln('\nTrả về kết quả theo định dạng sau:');
      promptBuffer.writeln('===TRANSLATION===');
      promptBuffer.writeln('(Nội dung bản dịch tiếng Việt)');
      promptBuffer.writeln('===GLOSSARY===');
      promptBuffer.writeln('(Các danh từ riêng mới phát hiện dạng: Từ Gốc=Nghĩa Dịch)');

      final url = Uri.parse(
        'https://generativelanguage.googleapis.com/v1beta/models/$modelName:generateContent?key=${keyItem.key}',
      );

      final payload = {
        'contents': [
          {
            'parts': [
              {'text': promptBuffer.toString()}
            ]
          }
        ],
        'generationConfig': {
          'temperature': 0.3,
          'maxOutputTokens': 8192,
        }
      };

      try {
        final response = await http.post(
          url,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode(payload),
        );

        if (response.statusCode == 200) {
          keyItem.successRequests++;
          final data = jsonDecode(response.body);
          final candidates = data['candidates'] as List?;
          if (candidates != null && candidates.isNotEmpty) {
            final content = candidates[0]['content'];
            final parts = content['parts'] as List?;
            final fullResp = parts != null && parts.isNotEmpty ? parts[0]['text'].toString() : '';

            // Tách bản dịch và glossary
            String transText = fullResp;
            String glossaryText = '';

            if (fullResp.contains('===TRANSLATION===')) {
              final split1 = fullResp.split('===TRANSLATION===');
              final rest = split1.length > 1 ? split1[1] : split1[0];
              if (rest.contains('===GLOSSARY===')) {
                final split2 = rest.split('===GLOSSARY===');
                transText = split2[0].trim();
                glossaryText = split2.length > 1 ? split2[1].trim() : '';
              } else {
                transText = rest.trim();
              }
            }

            return [transText, glossaryText];
          }
        } else if (response.statusCode == 429) {
          onLog('⚠️ Key ...${keyItem.key.substring(keyItem.key.length - 6)} dính Rate Limit (429). Đang chuyển Key tiếp theo...', 'warning');
          markKeyCooldown(keyItem, 60);
          continue;
        } else {
          onLog('❌ Lỗi HTTP ${response.statusCode} từ Gemini API', 'error');
          markKeyCooldown(keyItem, 30);
          continue;
        }
      } catch (e) {
        onLog('❌ Lỗi kết nối mạng: $e', 'error');
        continue;
      }
    }

    throw Exception('Đã thử $maxRetries lần nhưng không thể dịch được chương này.');
  }
}
