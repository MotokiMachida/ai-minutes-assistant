# AI Minutes Assistant

リアルタイムで会議音声を文字起こしし、Gemini AI が議事録を自動生成する Web アプリです。

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## 概要

マイクから録音した音声を Google Gemini API へ送信し、日本語テキストへリアルタイムで変換。  
文字起こし結果をもとに「要約 / TODO / 決定事項」を自動生成します。  
サーバー不要で、ブラウザだけで完結します。

| 機能 | 説明 |
|------|------|
| リアルタイム文字起こし | マイク音声を Gemini API へ送信し、日本語テキストに変換 |
| 議事録自動生成 | 文字起こし結果から「要約・TODO・決定事項」を構造化表示 |
| ネットワークエラー対応 | 指数バックオフによる自動リトライ |
| ブラウザのみで完結 | サーバー / バックエンド不要 |

**技術スタック:** React 19 / TypeScript / Tailwind CSS / Vite / Google Gemini API (`@google/genai`)

---

## デモ

```
録音開始 → 音声入力 → 文字起こし表示 → AI 分析ボタン → 議事録生成
```

---

## セットアップ

### 前提条件

- Node.js 18 以上
- Google Gemini API キー（無料取得: https://aistudio.google.com/app/apikey）
- Chrome ブラウザ（`MediaRecorder API` を使用）

### 手順

```bash
# 1. リポジトリをクローン
git clone https://github.com/MotokiMachida/ai-minutes-assistant.git
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

ブラウザで http://localhost:5173 を開いてください。

---

## 使い方

1. **録音開始** ボタンをクリック → ブラウザのマイク許可ダイアログで「許可」
2. 会議の音声に向かって話す
3. 左パネルへ文字起こし結果がリアルタイムで追加される
4. 右パネルの **AI 分析** ボタンで議事録（要約・TODO・決定事項）を生成
5. 必要に応じてテキストをコピーして活用

---

## 環境変数

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `VITE_GEMINI_API_KEY` | Google Gemini API キー | ✓ |

`.env.local` に記載してください（Git 管理外）。  
テンプレートとして `.env.example` を参照してください。

> **注意:** API キーを直接コードにハードコードしたり、`.env.local` を Git にコミットしないでください。

---

## ファイル構成

```
src/
├── components/
│   ├── TranscriptionPanel.tsx   # 文字起こし表示パネル
│   └── AnalysisPanel.tsx        # AI 議事録パネル
├── hooks/
│   ├── useSpeechRecognition.ts  # 録音 → Gemini 文字起こし
│   ├── useAnalysis.ts           # 議事録構造化分析
│   └── __tests__/               # フックのユニットテスト
├── services/
│   ├── gemini.ts                # Gemini API クライアント
│   └── __tests__/               # サービスのユニットテスト
├── types/
│   └── speech.d.ts              # 型定義
└── test/
    └── setup.ts                 # Vitest セットアップ
```

---

## 開発コマンド

```bash
npm run dev        # 開発サーバー起動 (http://localhost:5173)
npm run build      # 本番ビルド
npm run preview    # ビルド結果をローカルでプレビュー
npm run test       # ユニットテスト実行 (Vitest)
npm run lint       # ESLint 実行
```

---

## テスト

Vitest によるユニットテストを実装しています。

```bash
npm run test
```

- `src/services/__tests__/gemini.test.ts` — Gemini API クライアントのテスト
- `src/hooks/__tests__/useSpeechRecognition.test.ts` — 文字起こしフックのテスト
- `src/hooks/__tests__/useAnalysis.test.ts` — 分析フックのテスト

---

## 注意事項

- Gemini API の無料枠には利用制限があります（1 分あたりのリクエスト数など）
- マイク音声は Gemini API（Google）へ送信されます。機密性の高い会議での利用は [Gemini API 利用規約](https://ai.google.dev/gemini-api/terms) をご確認ください
- Chrome 以外のブラウザでは動作しない場合があります
- API キーはフロントエンドの環境変数として使用しているため、ビルド済みファイルに含まれます。本番公開時は [API キーの制限設定](https://cloud.google.com/docs/authentication/api-keys#api_key_restrictions) を行ってください

---

## ライセンス

[MIT](LICENSE)
