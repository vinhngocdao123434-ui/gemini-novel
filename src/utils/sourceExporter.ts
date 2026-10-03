import JSZip from 'jszip';

export async function downloadSourceCodeZip(): Promise<void> {
  const zip = new JSZip();

  // Package configs
  zip.file(
    'package.json',
    JSON.stringify(
      {
        name: 'droidtranslator-gemini-novel',
        private: true,
        version: '10.2.0',
        type: 'module',
        scripts: {
          dev: 'vite --host 0.0.0.0 --port 3000',
          build: 'vite build',
          preview: 'vite preview --host 0.0.0.0 --port 3000',
        },
        dependencies: {
          jszip: '^3.10.1',
          'lucide-react': '^1.16.0',
          react: '^18.3.1',
          'react-dom': '^18.3.1',
        },
        devDependencies: {
          '@tailwindcss/vite': '^4.0.0',
          '@types/jszip': '^3.4.1',
          '@types/react': '^18.3.18',
          '@types/react-dom': '^18.3.5',
          '@vitejs/plugin-react': '^4.3.4',
          tailwindcss: '^4.0.0',
          typescript: '^5.7.3',
          vite: '^6.0.7',
        },
      },
      null,
      2
    )
  );

  zip.file(
    'tsconfig.json',
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2020',
          useDefineForClassFields: true,
          lib: ['ES2020', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          skipLibCheck: true,
          moduleResolution: 'bundler',
          allowImportingTsExtensions: false,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: 'react-jsx',
          strict: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          noFallthroughCasesInSwitch: true,
        },
        include: ['src'],
      },
      null,
      2
    )
  );

  zip.file(
    'capacitor.config.json',
    JSON.stringify(
      {
        appId: 'com.droidtranslator.novel',
        appName: 'DroidTranslator',
        webDir: 'dist',
      },
      null,
      2
    )
  );

  const ghWorkflow = zip.folder('.github')?.folder('workflows');
  if (ghWorkflow) {
    ghWorkflow.file(
      'android.yml',
      `name: Android CI

on:
  push:
    branches: [ "main", "master" ]
  pull_request:
    branches: [ "main", "master" ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - name: 📥 Checkout repository
      uses: actions/checkout@v4

    - name: ☕ Set up Java JDK 21
      uses: actions/setup-java@v4
      with:
        java-version: '21'
        distribution: 'temurin'

    - name: 🟢 Set up Node.js 22
      uses: actions/setup-node@v4
      with:
        node-version: 22

    - name: 🛠️ Build Web Assets & Prepare Android
      run: |
        npm install
        npm run build
        if [ ! -f "android/gradlew" ]; then
          rm -rf android
          npx cap add android
        fi
        yes | "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --licenses 2>/dev/null || true
        "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" "platforms;android-36" 2>/dev/null || true
        npx cap sync android

    - name: 🔨 Build Debug APK
      run: |
        cd android
        chmod +x gradlew
        ./gradlew assembleDebug --no-daemon

    - name: 📤 Upload Debug APK Artifact
      uses: actions/upload-artifact@v4
      with:
        name: DroidTranslator-APK
        path: android/app/build/outputs/apk/debug/app-debug.apk
        if-no-files-found: error
        retention-days: 30
`
    );
  }

  zip.file(
    'vite.config.ts',
    `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
`
  );

  zip.file(
    'index.html',
    `<!DOCTYPE html>
<html lang="vi" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DroidTranslator - AI Novel Translator & Reader</title>
  </head>
  <body class="bg-[#0a0a0a] text-gray-100 antialiased min-h-screen">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`
  );

  zip.file(
    'README.md',
    `# DroidTranslator - AI Novel Translator & Reader (V10.2 Pro)

Web novel translation workstation rewritten from Android to React + TypeScript + Vite with Tailwind CSS.

## Tính Năng Nổi Bật
- **Multi-Key Gemini API Pool:** Luân chuyển vòng tròn, tự hạ nhiệt khi dính 429 rate limit.
- **Master Glossary AI Auto-Learning:** Tự động nhận diện và nạp danh từ riêng mới sau mỗi chương.
- **Offline Quality Auditor & Healer:** Tự động gọt rác, câu chào AI, sửa lỗi telex và thế bù từ điển 100% offline.
- **Auto-Retry Overwrite:** Tự động đổi Key và dịch lại ghi đè khi phát hiện lỗi nặng.
- **AMOLED & Sepia Reader:** Đọc toàn màn hình, chuyển chế độ Song ngữ / Tiếng Việt / Nguyên tác.
- **Export Đa Dạng:** Xuất toàn văn truyện (.txt) và tải mã nguồn (.zip).

## Cài Đặt & Khởi Chạy
\`\`\`bash
npm install
npm run dev
\`\`\`
`
  );

  zip.file(
    '.env.example',
    `# Optional fallback Gemini API key
GEMINI_API_KEY=
VITE_GEMINI_API_KEY=
`
  );

  // We can fetch our current source files dynamically from the browser bundle or include them
  // Let's create the src folder in zip
  const src = zip.folder('src')!;

  src.file(
    'main.tsx',
    `import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`
  );

  src.file(
    'index.css',
    `@import "tailwindcss";

@layer base {
  body {
    background-color: #0a0a0a;
    color: #f3f4f6;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #121212;
}

::-webkit-scrollbar-thumb {
  background: #2a2a2a;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #3f3f46;
}
`
  );

  // Read all src files from memory / import or text
  // Let's fetch them using fetch or inline text
  const fetchFile = async (path: string): Promise<string> => {
    try {
      const resp = await fetch(path);
      if (resp.ok) return await resp.text();
    } catch {}
    return '';
  };

  const fileList = [
    'src/types/index.ts',
    'src/utils/geminiEngine.ts',
    'src/utils/glossaryManager.ts',
    'src/utils/chapterAuditor.ts',
    'src/utils/fileParser.ts',
    'src/utils/storage.ts',
    'src/utils/sourceExporter.ts',
    'src/components/Header.tsx',
    'src/components/TabKeys.tsx',
    'src/components/TabTranslate.tsx',
    'src/components/TabReader.tsx',
    'src/components/TabSettings.tsx',
    'src/components/FullScreenReaderModal.tsx',
    'src/components/FullGlossaryModal.tsx',
    'src/components/PromptModal.tsx',
    'src/components/ProjectModal.tsx',
    'src/components/EditGlossaryModal.tsx',
    'src/App.tsx',
  ];

  for (const filePath of fileList) {
    const text = await fetchFile(`/${filePath}`);
    if (text) {
      zip.file(filePath, text);
    }
  }

  // Generate zip file
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'droidtranslator-web-source.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
