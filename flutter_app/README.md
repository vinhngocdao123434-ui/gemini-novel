# DroidTranslator Native - Flutter Android

Dự án Flutter thuần Android (100% Native, không WebView) được chuyển đổi hoàn chỉnh từ DroidTranslator.

## Đặc tính kỹ thuật Native Android:
- **Lưu trữ chuẩn Android 10-16:** Xuất trực tiếp vào `/storage/emulated/0/Download/` và hộp thoại hệ thống Storage Access Framework (SAF).
- **Thư mục ứng dụng:** Tự động tạo và nhận diện thư mục `Android/data/com.droidtranslator.novel/files/Novels/`.
- **Treo ngầm 24/24:** Tích hợp `flutter_foreground_task` + Foreground Service Notification + Wakelock CPU chống Deep Sleep khi tắt màn hình.
- **Root God-Mode:** Tùy chọn quyền Superuser (`su`) đặt OOM Score -1000 và vô hiệu hóa Phantom Process Killer trên Android 12-16.
- **Gemini Multi-Key Pool:** Tự động luân chuyển Key, tự hồi phục sau khi hết cooldown 429 rate-limit.
- **Audit & Healer:** Tự động gọt rác, câu chào AI, khử chữ Hán lọt và sửa lỗi chính tả offline (0% token).

## Cách Build Ra File APK:
```bash
# 1. Cài đặt dependencies
flutter pub get

# 2. Build Debug APK để cài thử nghiệm
flutter build apk --debug

# 3. Build Release APK tối ưu hóa
flutter build apk --release
```
File APK thành phẩm nằm tại:
`build/app/outputs/flutter-apk/app-release.apk`
