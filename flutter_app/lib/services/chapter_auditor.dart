class AuditResult {
  final int score;
  final bool hasCriticalError;
  final bool hasMildError;
  final List<String> issues;
  final List<String> healedActions;
  final String cleanedText;

  AuditResult({
    required this.score,
    required this.hasCriticalError,
    required this.hasMildError,
    required this.issues,
    required this.healedActions,
    required this.cleanedText,
  });
}

class ChapterAuditor {
  static final RegExp _hanziRegex = RegExp(r'[\u4e00-\u9fa5]');

  static AuditResult auditChapter(String rawText, String translatedText, Map<String, String> glossary) {
    int score = 100;
    bool isCritical = false;
    bool isMild = false;
    final issues = <String>[];
    final actions = <String>[];

    String cleaned = translatedText;

    // 1. Kiểm tra rỗng
    if (cleaned.trim().isEmpty) {
      return AuditResult(
        score: 0,
        hasCriticalError: true,
        hasMildError: false,
        issues: ['Bản dịch hoàn toàn rỗng'],
        healedActions: [],
        cleanedText: '',
      );
    }

    // 2. Gọt bỏ thẻ markdown ```
    if (cleaned.contains('```')) {
      cleaned = cleaned.replaceAll(RegExp(r'```[a-zA-Z]*\n?'), '').replaceAll('```', '');
      actions.add('Đã gỡ bỏ thẻ code block markdown');
      isMild = true;
    }

    // 3. Gọt bỏ câu chào AI
    final aiGreetingPatterns = [
      RegExp(r'^(Dưới đây là bản dịch|Đây là bản dịch|Bản dịch của bạn|Vâng, đây là).*\n+', caseSensitive: false),
      RegExp(r'\n+(Hy vọng bản dịch|Chúc bạn đọc truyện|Nếu cần sửa|Cảm ơn bạn).*$', caseSensitive: false),
    ];
    for (final pattern in aiGreetingPatterns) {
      if (pattern.hasMatch(cleaned)) {
        cleaned = cleaned.replaceAll(pattern, '');
        actions.add('Đã gọt sạch câu chào/kết của AI');
        isMild = true;
      }
    }

    // 4. Quét chữ Hán sót lại và thế bằng Glossary
    final hanziMatches = _hanziRegex.allMatches(cleaned).length;
    if (hanziMatches > 0) {
      glossary.forEach((raw, vi) {
        if (cleaned.contains(raw)) {
          cleaned = cleaned.replaceAll(raw, vi);
          actions.add('Đã tự động thay thế thuật ngữ Hán: [$raw -> $vi]');
          isMild = true;
        }
      });

      final remainingHanzi = _hanziRegex.allMatches(cleaned).length;
      if (remainingHanzi > 20) {
        score -= 40;
        issues.add('Lọt $remainingHanzi chữ Hán chưa được dịch');
        isCritical = true;
      } else if (remainingHanzi > 0) {
        score -= 15;
        issues.add('Còn sót $remainingHanzi ký tự chữ Hán');
        isMild = true;
      }
    }

    // 5. Kiểm tra tỷ lệ độ dài
    if (rawText.length > 500 && cleaned.length < rawText.length * 0.3) {
      score -= 50;
      issues.add('Bản dịch quá ngắn so với nguyên tác (mất nội dung)');
      isCritical = true;
    }

    return AuditResult(
      score: score.clamp(0, 100),
      hasCriticalError: isCritical,
      hasMildError: isMild,
      issues: issues,
      healedActions: actions,
      cleanedText: cleaned.trim(),
    );
  }
}
