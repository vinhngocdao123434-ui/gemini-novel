import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'models/app_models.dart';
import 'services/storage_service.dart';
import 'services/root_service.dart';
import 'services/gemini_service.dart';
import 'services/chapter_auditor.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: Color(0xFF141414),
  ));
  runApp(const DroidTranslatorApp());
}

class DroidTranslatorApp extends StatelessWidget {
  const DroidTranslatorApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DroidTranslator Native',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0A0A0A),
        primaryColor: const Color(0xFF2563EB),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF2563EB),
          surface: Color(0xFF141414),
        ),
        cardColor: const Color(0xFF161B22),
        dividerColor: const Color(0xFF222222),
        fontFamily: 'Roboto',
      ),
      home: const MainTranslationScreen(),
    );
  }
}

class MainTranslationScreen extends StatefulWidget {
  const MainTranslationScreen({super.key});

  @override
  State<MainTranslationScreen> createState() => _MainTranslationScreenState();
}

class _MainTranslationScreenState extends State<MainTranslationScreen> {
  int _activeTab = 1; // Default to Tab Translate

  ProjectData _projectData = ProjectData(
    projectName: 'Dai_Quan_Gia_Ma_Hoang',
    rawChapters: [
      '第一章 少年与剑\n在偏僻的青石村中，有一位身负残破木剑的少年，名为林辰。\n林辰背着一把长剑，走在深邃的巷子里，眼神坚毅无比。\n青云宗的收徒大典即将开始，整个赵国风起云涌。\n赵霸天站在高处冷笑：“林辰，今日就是你的死期！”',
      '第二章 青云仙宗\n青云宗山门耸立在云海之巅，气势磅礴。\n数以千计的年轻才俊汇聚在巨大的演武广场上。\n黑风寨的探子潜伏在暗处，死死盯着演武场中央的林辰...',
    ],
    translatedChapters: {
      0: 'Chương 1: Thiếu Niên Và Kiếm\n\nTại thôn Thanh Thạch hẻo lánh, có một thiếu niên mang trên lưng thanh mộc kiếm tàn tạ, tên gọi Lâm Thần.\nLâm Thần đeo trường kiếm sau lưng, bước đi trong con ngõ sâu thẳm, ánh mắt vô cùng kiên định.\nĐại điển thu đồ của Thanh Vân Tông sắp sửa bắt đầu, toàn bộ Triệu quốc phong vân biến động.\nTriệu Bá Thiên đứng trên chỗ cao cười lạnh: "Lâm Thần, hôm nay chính là ngày tàn của ngươi!"\n',
    },
    masterGlossary: {
      '林辰': 'Lâm Thần',
      '青云宗': 'Thanh Vân Tông',
      '赵霸天': 'Triệu Bá Thiên',
      '黑风寨': 'Hắc Phong Trại',
      '青石村': 'thôn Thanh Thạch',
    },
  );

  final List<ApiKeyItem> _apiKeys = [
    ApiKeyItem(key: 'AIzaSyDemoSampleKeyNumberOneXYZ12345'),
  ];

  final List<PromptCardItem> _promptCards = [
    PromptCardItem(
      id: 1,
      title: 'Tiên Hiệp (Chuẩn mực)',
      content: 'Dịch sang tiếng Việt tiểu thuyết tiên hiệp trôi chảy, đúng ngữ pháp. Xưng hô: hắn, nàng, ta, ngươi. Tên riêng giữ âm Hán-Việt.',
      active: true,
    ),
  ];

  final List<Map<String, String>> _logs = [];
  bool _isTranslating = false;
  bool _isPaused = false;
  int _currentTranslatingIndex = -1;
  String _currentModel = 'gemini-2.5-flash';
  bool _isRootActive = false;

  @override
  void initState() {
    super.initState();
    _initApp();
  }

  Future<void> _initApp() async {
    // 1. Xin quyền bộ nhớ tự động khi khởi động
    await StorageService.requestStoragePermissions();
    // 2. Khởi tạo thư mục /Android/data/.../Novels
    await StorageService.ensureAndroidDataNovelsDir();
    // 3. Kiểm tra trạng thái Root
    final rooted = await RootService.isDeviceRooted();
    setState(() {
      _isRootActive = rooted;
    });
    _addLog('🚀 Ứng dụng Flutter Native khởi động thành công. Quyền Root: ${rooted ? "CÓ" : "KHÔNG"}', 'info');
  }

  void _addLog(String text, String type) {
    setState(() {
      _logs.insert(0, {
        'time': DateTime.now().toIso8601String().substring(11, 19),
        'text': text,
        'type': type,
      });
      if (_logs.length > 100) _logs.removeLast();
    });
  }

  // --- Core Translation Range Logic ---
  Future<void> _startRangeTranslation(int from, int to) async {
    if (_apiKeys.isEmpty) {
      _addLog('⚠️ Vui lòng nạp ít nhất 1 Gemini API Key ở Thẻ 1!', 'warning');
      return;
    }

    setState(() {
      _isTranslating = true;
      _isPaused = false;
    });

    // Kích hoạt Foreground Service để chạy ngầm 24/24 không bị hệ thống tắt
    await RootService.startForegroundTask();
    _addLog('⚡ Đã kích hoạt Foreground Service: Treo dịch ngầm 24/24 bất tử.', 'info');

    final gemini = GeminiService(_apiKeys);
    final prompt = _promptCards.firstWhere((p) => p.active, orElse: () => _promptCards[0]).content;

    for (int i = from - 1; i < to && i < _projectData.rawChapters.length; i++) {
      if (!_isTranslating) break;
      while (_isPaused && _isTranslating) {
        await Future.delayed(const Duration(milliseconds: 500));
      }
      if (!_isTranslating) break;

      setState(() => _currentTranslatingIndex = i);
      _addLog('⏳ Đang dịch Chương ${i + 1}...', 'ai');

      try {
        final raw = _projectData.rawChapters[i];
        final res = await gemini.translateChapter(
          rawText: raw,
          systemPrompt: prompt,
          masterGlossary: _projectData.masterGlossary,
          modelName: _currentModel,
          targetLanguage: 'Tiếng Việt',
          antiHanzi: true,
          onLog: (msg, type) => _addLog(msg, type),
        );

        final transText = res[0];
        // Kiểm định và sửa lỗi offline
        final audit = ChapterAuditor.auditChapter(raw, transText, _projectData.masterGlossary);
        final finalCleaned = audit.cleanedText.isNotEmpty ? audit.cleanedText : transText;

        setState(() {
          _projectData.translatedChapters[i] = finalCleaned;
          _projectData.chapterAuditStatus[i] = ChapterAuditInfo(
            score: audit.score,
            status: audit.hasCriticalError ? 'critical' : audit.hasMildError ? 'healed' : 'good',
            issues: audit.issues,
            healedActions: audit.healedActions,
            timestamp: DateTime.now().toIso8601String(),
          );
        });

        await StorageService.saveProject(_projectData);
        _addLog('✅ Hoàn tất Chương ${i + 1} (${audit.score}/100đ)', 'success');
      } catch (e) {
        _addLog('❌ Lỗi dịch chương ${i + 1}: $e', 'error');
      }

      await Future.delayed(const Duration(seconds: 2));
    }

    setState(() {
      _isTranslating = false;
      _currentTranslatingIndex = -1;
    });

    await RootService.stopForegroundTask();
    _addLog('🎉 Đã hoàn tất dải chương được chỉ định!', 'success');
  }

  // --- Export Full Novel to Storage ---
  Future<void> _exportFullNovel({required bool useSaf}) async {
    final transKeys = _projectData.translatedChapters.keys.toList()..sort();
    if (transKeys.isEmpty) {
      _addLog('⚠️ Chưa có chương nào được dịch để xuất!', 'warning');
      return;
    }

    final buffer = StringBuffer();
    buffer.writeln('=== TOÀN VĂN: ${_projectData.projectName} ===');
    buffer.writeln('Biên dịch: DroidTranslator Flutter Native');
    buffer.writeln('Thời gian xuất: ${DateTime.now()}\n');

    for (final k in transKeys) {
      buffer.writeln('============================================================');
      buffer.writeln(_projectData.translatedChapters[k]);
      buffer.writeln('\n');
    }

    final filename = '${_projectData.projectName}_FULL.txt';
    final content = buffer.toString();

    _addLog('💾 Đang ghi tệp vào bộ nhớ thiết bị...', 'info');

    if (useSaf) {
      final res = await StorageService.exportWithSAF(filename, content);
      _addLog(res['message'], res['success'] == true ? 'success' : 'warning');
    } else {
      final res = await StorageService.saveDirectToDownloadFolder(filename, content);
      _addLog(res['message'], res['success'] == true ? 'success' : 'warning');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF141414),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Text('DroidTranslator Native', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: _isRootActive ? const Color(0xFF10B981).withOpacity(0.2) : Colors.amber.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: _isRootActive ? const Color(0xFF10B981) : Colors.amber, width: 0.5),
                  ),
                  child: Text(
                    _isRootActive ? 'ROOT GOD-MODE' : 'FLUTTER NATIVE',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: _isRootActive ? const Color(0xFF34D399) : Colors.amberAccent,
                    ),
                  ),
                ),
              ],
            ),
            Text(
              '${_projectData.projectName} · ${_apiKeys.length} Keys',
              style: const TextStyle(fontSize: 11, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.download, size: 20, color: Colors.blueAccent),
            tooltip: 'Lưu vào thư mục Download',
            onPressed: () => _exportFullNovel(useSaf: false),
          ),
          IconButton(
            icon: const Icon(Icons.create_new_folder, size: 20, color: Color(0xFF34D399)),
            tooltip: 'Chọn nơi lưu (SAF)',
            onPressed: () => _exportFullNovel(useSaf: true),
          ),
        ],
      ),
      body: _buildCurrentTab(),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _activeTab,
        onTap: (idx) => setState(() => _activeTab = idx),
        backgroundColor: const Color(0xFF141414),
        selectedItemColor: const Color(0xFF3B82F6),
        unselectedItemColor: Colors.grey,
        type: BottomNavigationBarType.fixed,
        selectedFontSize: 11,
        unselectedFontSize: 11,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.vpn_key, size: 18), label: 'Key & Prompt'),
          BottomNavigationBarItem(icon: Icon(Icons.play_arrow, size: 18), label: 'Dịch & Từ điển'),
          BottomNavigationBarItem(icon: Icon(Icons.menu_book, size: 18), label: 'Đọc & Duyệt'),
          BottomNavigationBarItem(icon: Icon(Icons.settings, size: 18), label: 'Cài đặt & Root'),
        ],
      ),
    );
  }

  Widget _buildCurrentTab() {
    switch (_activeTab) {
      case 0:
        return _buildTabKeys();
      case 1:
        return _buildTabTranslate();
      case 2:
        return _buildTabReader();
      case 3:
      default:
        return _buildTabSettings();
    }
  }

  // --- TAB 1: Key & Prompt ---
  Widget _buildTabKeys() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildCard(
          title: '1. Chọn Mô Hình Gemini',
          icon: Icons.memory,
          child: Wrap(
            spacing: 8,
            children: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'].map((m) {
              final sel = _currentModel == m;
              return ChoiceChip(
                label: Text(m, style: const TextStyle(fontSize: 12)),
                selected: sel,
                selectedColor: Colors.blueAccent,
                onSelected: (val) {
                  if (val) setState(() => _currentModel = m);
                },
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 12),
        _buildCard(
          title: '2. Multi-Key Gemini Pool (${_apiKeys.length} Keys)',
          icon: Icons.vpn_key,
          child: Column(
            children: [
              ..._apiKeys.map((k) {
                final masked = k.key.length > 8 ? '...${k.key.substring(k.key.length - 8)}' : k.key;
                return Container(
                  margin: const EdgeInsets.only(bottom: 6),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0D1117),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFF30363D)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.key, size: 14, color: Colors.amberAccent),
                      const SizedBox(width: 8),
                      Expanded(child: Text(masked, style: const TextStyle(fontFamily: 'monospace', fontSize: 12))),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: k.state == 'ACTIVE' ? const Color(0xFF10B981).withOpacity(0.2) : Colors.amber.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(k.state, style: TextStyle(fontSize: 10, color: k.state == 'ACTIVE' ? const Color(0xFF34D399) : Colors.amberAccent)),
                      ),
                    ],
                  ),
                );
              }),
            ],
          ),
        ),
      ],
    );
  }

  // --- TAB 2: Translate & Glossary ---
  Widget _buildTabTranslate() {
    final totalRaw = _projectData.rawChapters.length;
    final totalTrans = _projectData.translatedChapters.length;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Project Overview
        _buildCard(
          title: 'Dự Án: ${_projectData.projectName}',
          icon: Icons.layers,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Đã dịch: $totalTrans / $totalRaw chương', style: const TextStyle(fontSize: 12, color: Colors.grey)),
              Text('Glossary: ${_projectData.masterGlossary.length} từ', style: const TextStyle(fontSize: 12, color: Colors.blueAccent)),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Controls
        _buildCard(
          title: 'Điều Khiển Dịch Thuật Tự Động',
          icon: Icons.play_circle_fill,
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _isTranslating ? Colors.amber[800] : Colors.blue[700],
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      icon: Icon(_isTranslating ? (_isPaused ? Icons.play_arrow : Icons.pause) : Icons.play_arrow, size: 16),
                      label: Text(_isTranslating ? (_isPaused ? 'Tiếp tục' : 'Tạm dừng') : 'Bắt đầu Dịch Toàn Bộ'),
                      onPressed: () {
                        if (_isTranslating) {
                          setState(() => _isPaused = !_isPaused);
                        } else {
                          _startRangeTranslation(1, totalRaw);
                        }
                      },
                    ),
                  ),
                  if (_isTranslating) ...[
                    const SizedBox(width: 8),
                    IconButton(
                      icon: const Icon(Icons.stop, color: Color(0xFFF43F5E)),
                      onPressed: () => setState(() => _isTranslating = false),
                    )
                  ]
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Realtime Terminal Logs
        _buildCard(
          title: 'Nhật Ký Thực Thi (Realtime Terminal)',
          icon: Icons.terminal,
          child: Container(
            height: 160,
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.black,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFF222222)),
            ),
            child: ListView.builder(
              reverse: false,
              itemCount: _logs.length,
              itemBuilder: (context, idx) {
                final l = _logs[idx];
                Color c = Colors.grey;
                if (l['type'] == 'success') c = const Color(0xFF34D399);
                if (l['type'] == 'error') c = const Color(0xFFF43F5E);
                if (l['type'] == 'warning') c = Colors.amberAccent;
                if (l['type'] == 'ai') c = Colors.blueAccent;

                return Text('[${l['time']}] ${l['text']}', style: TextStyle(fontSize: 11, color: c, fontFamily: 'monospace'));
              },
            ),
          ),
        ),
      ],
    );
  }

  // --- TAB 3: Reader & Audit ---
  Widget _buildTabReader() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _projectData.rawChapters.length,
      itemBuilder: (context, idx) {
        final isDone = _projectData.translatedChapters.containsKey(idx);
        final isCurrent = _isTranslating && _currentTranslatingIndex == idx;
        final audit = _projectData.chapterAuditStatus[idx];

        return Card(
          color: isCurrent
              ? const Color(0xFF1E3A8A)
              : isDone
                  ? const Color(0xFF064E3B).withOpacity(0.4)
                  : const Color(0xFF161B22),
          margin: const EdgeInsets.only(bottom: 8),
          child: ListTile(
            leading: Text('#${idx + 1}', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
            title: Text(
              isDone ? _projectData.translatedChapters[idx]!.split('\n')[0] : 'Chương ${idx + 1} (Chưa dịch)',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
            ),
            subtitle: audit != null
                ? Text('Chất lượng: ${audit.score}/100đ · ${audit.status}', style: const TextStyle(fontSize: 11, color: Colors.grey))
                : null,
            trailing: isCurrent
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                : Icon(isDone ? Icons.check_circle : Icons.schedule, size: 16, color: isDone ? const Color(0xFF34D399) : Colors.grey),
          ),
        );
      },
    );
  }

  // --- TAB 4: Settings & Root ---
  Widget _buildTabSettings() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildCard(
          title: 'Quyền Root & Kernel God-Mode',
          icon: Icons.security,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Thiết bị có Root: ${_isRootActive ? "ĐÃ CẤP QUYỀN" : "CHƯA ROOT"}', style: TextStyle(fontSize: 12, color: _isRootActive ? const Color(0xFF34D399) : Colors.amberAccent)),
              const SizedBox(height: 8),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E293B)),
                icon: const Icon(Icons.bolt, size: 16, color: Colors.amberAccent),
                label: const Text('Kích hoạt OOM -1000 & Tắt Phantom Killer'),
                onPressed: () async {
                  final res = await RootService.acquireGodMode();
                  _addLog(res['message'], res['success'] == true ? 'success' : 'warning');
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        _buildCard(
          title: 'Xuất Dữ Liệu Tác Phẩm',
          icon: Icons.cloud_download,
          child: Column(
            children: [
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.download, color: Colors.blueAccent),
                title: const Text('Tự động lưu vào /storage/emulated/0/Download/', style: TextStyle(fontSize: 13)),
                onTap: () => _exportFullNovel(useSaf: false),
              ),
              const Divider(),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.create_new_folder, color: Color(0xFF34D399)),
                title: const Text('Chọn thư mục lưu tùy ý (SAF - Thẻ nhớ SD, v.v.)', style: TextStyle(fontSize: 13)),
                onTap: () => _exportFullNovel(useSaf: true),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCard({required String title, required IconData icon, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF141414),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF222222)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: const Color(0xFF3B82F6)),
              const SizedBox(width: 8),
              Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white)),
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}
