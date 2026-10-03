# DroidTranslator - AI Novel Translator & Reader

A multi-chapter web novel translation workstation and reader rewritten from Android into React + TypeScript + Vite with Tailwind CSS.

## Features Ported

1. **Tab 1: Key & Prompt Management**:
   - Gemini Model selector: `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-3.5-flash-lite`, `gemini-2.5-pro` & custom model IDs.
   - Multi-Key API Pool: Add single or bulk keys, test individual/all keys, track requests/success count, automated round-robin rotation, and smart 429 rate-limit cooldown handling.
   - Prompt Cards: Preset and custom customizable prompt cards (Tiên Hiệp, Đô Thị, Huyền Huyễn, etc.).

2. **Tab 2: Translation & Glossary Engine (Dịch & Từ điển)**:
   - Multi-Project switching and creation with independent storage per novel.
   - Chapter Range Translation (Từ chương -> Đến chương) with Start, Pause/Resume, and Cancel controls.
   - Smart Chapter Splitter: Author chapter regex (`第X章`, `Chương X`) and custom character chunk size splitting.
   - Multi-format file support: `.txt` and `.epub` (JSZip-based client parser).
   - Master Glossary: Add, edit, delete, import from `.txt`, export to `.txt` or clipboard.
   - AI Auto-Learning Glossary: Real-time dynamic extraction of new proper nouns from Gemini response after every translated chapter.
   - Context continuity: Automatic snippet extraction of the previous chapter translation (last 300-350 chars) for seamless tone and pronoun consistency.
   - Dual-Layer Anti-Hanzi Protection: Prompt constraints + regex post-processing filter.
   - Live Console Logs with real-time autoscroll and color-coded status badges.

3. **Tab 3: Chapter Explorer & Reader (Bản dịch & Đọc)**:
   - 100 chapters per page pagination for ultra-fast rendering.
   - Fullscreen Reader Modal with 3 reading modes (Tiếng Việt, Song Ngữ, Nguyên Tác), 3 themes (AMOLED, Sepia, Sáng), font scaling, copy text, and chapter forward/backward navigation.
   - Export full translated novel to `.txt` with automatic download and clipboard copy.

4. **Tab 4: Deep Settings Hub (Cài đặt)**:
   - Project management & safe project deletion with data protection guarantee for API keys and Prompts.
   - Glossary AI Auto-Learning parameters (Min Chinese char length, min frequency in chapter, conflict policy).
   - Target Language configuration (`Tiếng Việt`, `日本語`, `English`, `한국어`).
   - Anti-Hanzi 2-layer toggle and inter-chapter delay settings.
   - God-Mode background execution status indicators.

## Running Locally

```bash
npm install
npm run dev
```
