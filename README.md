# AI Minutes Assistant

リアルタイムで会議音声を文字起こしし、Gemini AI が議事録を自動生成する Web アプリです。

---

## 概要

| 機能 | 説明 |
|------|------|
| リアルタイム文字起こし | マイク音声を 5 秒ごとに Gemini API へ送信し、日本語テキストに変換 |
| 議事録自動生成 | 文字起こし結果から「要約 / TODO / 決定事項」を構造化して表示 |
| ブラウザのみで完結 | サーバー不要。ローカルで起動してすぐ使える |

**技術スタック:** React 19 / TypeScript / Tailwind CSS / Vite / Google Gemini API (`@google/genai`)

---

## セットアップ

### 前提条件

- Node.js 18 以上
- Google Gemini API キー（無料取得可: https://aistudio.google.com/app/apikey）
- Chrome ブラウザ（マイク入力に `MediaRecorder API` を使用）

### 手順

```bash
# 1. リポジトリをクローン
git clone https://github.com/<your-username>/ai-minutes-assistant.git
cd ai-minutes-assistant

# 2. 依存パッケージをインストール
npm install

# 3. 環境変数ファイルを作成
cp .env.example .env.local

# 4. .env.local を編集して API キーを設定
#    VITE_GEMINI_API_KEY=<取得した API キー>

# 5. 開発サーバーを起動
npm run dev
```

ブラウザで `http://localhost:5173` を開いてください。

---

## 使い方

1. **録音開始** ボタンをクリック → ブラウザのマイク許可ダイアログで「許可」
2. 会議の音声に向かって話す
3. 5 秒ごとに左パネルへ文字起こし結果が追加される
4. 右パネルの **AI 分析** ボタンで議事録（要約・TODO・決定事項）を生成

---

## ファイル構成

```
src/
├── components/
│   ├── TranscriptionPanel.tsx   # 文字起こし表示パネル
│   └── AnalysisPanel.tsx        # AI 議事録パネル
├── hooks/
│   ├── useSpeechRecognition.ts  # 録音 → Gemini 文字起こし
│   └── useAnalysis.ts           # 議事録構造化分析
└── services/
    └── gemini.ts                # Gemini API クライアント
```

---

## 環境変数

| 変数名 | 説明 |
|--------|------|
| `VITE_GEMINI_API_KEY` | Google Gemini API キー（必須） |

`.env.local` に記載してください。このファイルは `.gitignore` により Git 管理外です。  
`.env.example` にダミー値入りのテンプレートがあります。

---

## 開発コマンド

```bash
npm run dev        # 開発サーバー起動
npm run build      # 本番ビルド
npm run preview    # ビルド結果をローカルでプレビュー
npm run test       # ユニットテスト実行 (Vitest)
npm run lint       # ESLint 実行
```

---

## 注意事項

- Gemini API の無料枠には利用制限があります（1 分あたりのリクエスト数など）
- マイク音声は Gemini API（Google）へ送信されます。機密性の高い会議での利用は Gemini API の利用規約をご確認ください
- Chrome 以外のブラウザでは動作しない場合があります
