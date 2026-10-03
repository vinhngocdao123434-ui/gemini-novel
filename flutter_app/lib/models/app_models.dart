class ApiKeyItem {
  final String key;
  String state; // ACTIVE, COOLDOWN, ERROR, TESTING
  int cooldownUntil;
  int totalRequests;
  int successRequests;

  ApiKeyItem({
    required this.key,
    this.state = 'ACTIVE',
    this.cooldownUntil = 0,
    this.totalRequests = 0,
    this.successRequests = 0,
  });

  Map<String, dynamic> toJson() => {
        'key': key,
        'state': state,
        'cooldownUntil': cooldownUntil,
        'totalRequests': totalRequests,
        'successRequests': successRequests,
      };

  factory ApiKeyItem.fromJson(Map<String, dynamic> json) => ApiKeyItem(
        key: json['key'] ?? '',
        state: json['state'] ?? 'ACTIVE',
        cooldownUntil: json['cooldownUntil'] ?? 0,
        totalRequests: json['totalRequests'] ?? 0,
        successRequests: json['successRequests'] ?? 0,
      );
}

class PromptCardItem {
  final int id;
  String title;
  String content;
  bool active;

  PromptCardItem({
    required this.id,
    required this.title,
    required this.content,
    this.active = false,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'content': content,
        'active': active,
      };

  factory PromptCardItem.fromJson(Map<String, dynamic> json) => PromptCardItem(
        id: json['id'] ?? 0,
        title: json['title'] ?? '',
        content: json['content'] ?? '',
        active: json['active'] ?? false,
      );
}

class ChapterAuditInfo {
  final int score;
  final String status; // good, healed, critical
  final List<String> issues;
  final List<String> healedActions;
  final String timestamp;

  ChapterAuditInfo({
    required this.score,
    required this.status,
    required this.issues,
    this.healedActions = const [],
    required this.timestamp,
  });

  Map<String, dynamic> toJson() => {
        'score': score,
        'status': status,
        'issues': issues,
        'healedActions': healedActions,
        'timestamp': timestamp,
      };

  factory ChapterAuditInfo.fromJson(Map<String, dynamic> json) => ChapterAuditInfo(
        score: json['score'] ?? 100,
        status: json['status'] ?? 'good',
        issues: List<String>.from(json['issues'] ?? []),
        healedActions: List<String>.from(json['healedActions'] ?? []),
        timestamp: json['timestamp'] ?? '',
      );
}

class ProjectData {
  String projectName;
  int currentChapterIdx;
  String loadedRawContent;
  List<String> rawChapters;
  Map<int, String> translatedChapters;
  Map<String, String> masterGlossary;
  Map<int, ChapterAuditInfo> chapterAuditStatus;

  ProjectData({
    required this.projectName,
    this.currentChapterIdx = 0,
    this.loadedRawContent = '',
    this.rawChapters = const [],
    Map<int, String>? translatedChapters,
    Map<String, String>? masterGlossary,
    Map<int, ChapterAuditInfo>? chapterAuditStatus,
  })  : translatedChapters = translatedChapters ?? {},
        masterGlossary = masterGlossary ?? {},
        chapterAuditStatus = chapterAuditStatus ?? {};

  Map<String, dynamic> toJson() => {
        'projectName': projectName,
        'currentChapterIdx': currentChapterIdx,
        'loadedRawContent': loadedRawContent,
        'rawChapters': rawChapters,
        'translatedChapters': translatedChapters.map((k, v) => MapEntry(k.toString(), v)),
        'masterGlossary': masterGlossary,
        'chapterAuditStatus': chapterAuditStatus.map((k, v) => MapEntry(k.toString(), v.toJson())),
      };

  factory ProjectData.fromJson(Map<String, dynamic> json) {
    final transMap = <int, String>{};
    if (json['translatedChapters'] != null) {
      (json['translatedChapters'] as Map).forEach((k, v) {
        transMap[int.tryParse(k.toString()) ?? 0] = v.toString();
      });
    }

    final auditMap = <int, ChapterAuditInfo>{};
    if (json['chapterAuditStatus'] != null) {
      (json['chapterAuditStatus'] as Map).forEach((k, v) {
        auditMap[int.tryParse(k.toString()) ?? 0] = ChapterAuditInfo.fromJson(Map<String, dynamic>.from(v));
      });
    }

    return ProjectData(
      projectName: json['projectName'] ?? 'Dai_Quan_Gia_Ma_Hoang',
      currentChapterIdx: json['currentChapterIdx'] ?? 0,
      loadedRawContent: json['loadedRawContent'] ?? '',
      rawChapters: List<String>.from(json['rawChapters'] ?? []),
      translatedChapters: transMap,
      masterGlossary: Map<String, String>.from(json['masterGlossary'] ?? {}),
      chapterAuditStatus: auditMap,
    );
  }
}
