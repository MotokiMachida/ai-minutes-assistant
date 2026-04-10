# AI Minutes Assistant

会議音声を録音し、Gemini AI が文字起こし・議事録を自動生成する Web アプリです。

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)
![Vercel](https://img.shields.io/badge/Vercel-Functions-000000?logo=vercel)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## 概要

マイクで録音した会議音声を停止後に一括で Gemini API へ送信し、日本語テキストへ変換します。
文字起こし結果をもとに「要約 / TODO / 決定事項」を自動生成します。

**APIキーはサーバーサイド（Vercel Functions）のみで管理**され、ブラウザに公開されません。

| 機能 | 説明 |
|------|------|
| 音声文字起こし | 録音停止後に音声を一括送信・日本語テキストに変換（最大約90分） |
| 議事録自動生成 | 文字起こし結果から「要約・TODO・決定事項」を構造化表示 |
| セキュアなAPI通信 | Vercel Functions 経由でAPIキーをサーバーサイドに秘匿 |
| 長時間録音対応 | 16kbps 録音で約90分まで区切りなし対応 |

**技術スタック:** React 19 / TypeScript / Tailwind CSS v4 / Vite 8 / Vercel Functions / Google Gemini API (`gemini-2.0-flash`)

---

## アーキテクチャ

```
ブラウザ（React）
  │
  ├─ 録音停止時 ──→ POST /api/transcribe ──→ Gemini API（文字起こし）
  │                  ↑ Vercel Function
  │                  ↑ GEMINI_API_KEY はここにのみ存在
  │
  └─ AI分析ボタン → POST /api/generate  ──→ Gemini API（議事録生成）
                     ↑ Vercel Function
```

---

## セットアップ

### 前提条件

- Google Gemini API キー（無料取得: https://aistudio.google.com/app/apikey）
- Node.js 18 以上
- Chrome ブラウザ（`MediaRecorder API` を使用）

---

### ローカル開発

```bash
# 1. リポジトリをクローン
git clone https://github.com/MotokiMachida/ai-minutes-assistant.git
cd ai-minutes-assistant

# 2. 依存パッケージをインストール
npm install

# 3. 環境変数ファイルを作成
cp .env.example .env.local
# .env.local を開いて GEMINI_API_KEY=<APIキー> を設定

# 4. 開発サーバーを起動（APIルートを含むフルスタック）
npm run dev:api
```

ブラウザで表示された URL（例: http://localhost:3000）を開いてください。

> **注意:** `npm run dev` は Vite のみ起動します。文字起こし・議事録生成を含めてテストする場合は `npm run dev:api` を使用してください。

---

### Docker（開発環境）

```bash
# 1. 環境変数ファイルを作成
cp .env.example .env
# .env を開いて GEMINI_API_KEY=<APIキー> を設定

# 2. コンテナをビルドして起動
docker compose up --build
```

ブラウザで http://localhost:3000 を開いてください。

- `GEMINI_API_KEY` は `.env` から自動的に読み込まれ、コンテナ内の Express サーバーへ環境変数として渡されます
- ソースコードを変更すると Vite HMR が自動リロードします（`docker compose up` 中はコンテナ内で動作）
- `.env` はコンテナ内のみで使用されます（ブラウザには公開されません）

---

### Vercel へのデプロイ

1. GitHub リポジトリを Vercel に連携
2. Vercel ダッシュボード → **Settings → Environment Variables** に以下を追加

| 変数名 | 説明 |
|--------|------|
| `GEMINI_API_KEY` | Google Gemini API キー（サーバーサイドのみ） |

3. デプロイ完了後、自動的に `/api/transcribe` と `/api/generate` が有効になります

---

## 使い方

1. **録音開始** ボタンをクリック → マイク許可ダイアログで「許可」
2. 会議の音声に向かって話す（最大約90分）
3. **停止して文字起こし** ボタンをクリック
4. Gemini が音声全体をまとめて文字起こし → 左パネルに表示
5. 右パネルの **AI 分析** ボタンで議事録（要約・TODO・決定事項）を生成

---

## 環境変数

| 変数名 | 説明 | 設定場所 |
|--------|------|---------|
| `GEMINI_API_KEY` | Google Gemini API キー | `.env.local`（ローカル） / Vercel 環境変数（本番） |

> `VITE_` プレフィックスなし = ブラウザに公開されない = セキュア

---

## 開発コマンド

```bash
npm run dev          # Vite のみ起動（UIの確認用）
npm run dev:api      # vercel dev 起動（APIルートを含むフルスタック）
npm run dev:docker   # Vite + Express 起動（Docker 内フルスタック）
npm run build        # 本番ビルド
npm run test         # ユニットテスト実行（Vitest）
npm run lint         # ESLint 実行
```

---

## ファイル構成

```
api/
├── transcribe.ts        # 音声文字起こしエンドポイント（Node.js / 20MB上限）
└── generate.ts          # 議事録生成エンドポイント（Node.js）

src/
├── components/
│   ├── TranscriptionPanel.tsx   # 録音・文字起こし表示パネル
│   └── AnalysisPanel.tsx        # AI 議事録パネル
├── hooks/
│   ├── useSpeechRecognition.ts  # 録音 → バッファ → 停止時一括送信
│   ├── useAnalysis.ts           # 議事録生成
│   └── __tests__/               # ユニットテスト
├── services/
│   ├── gemini.ts                # /api/* への fetch ラッパー
│   └── __tests__/
└── test/
    └── setup.ts
```

---

## テスト

```bash
npm run test
```

- `src/services/__tests__/gemini.test.ts` — API クライアントのテスト
- `src/hooks/__tests__/useSpeechRecognition.test.ts` — 録音フックのテスト
- `src/hooks/__tests__/useAnalysis.test.ts` — 分析フックのテスト

---

## 注意事項

- Gemini API 無料枠の日次上限に達すると 429 エラーになります。翌日にリセットされます
- マイク音声は Gemini API（Google）へ送信されます。機密性の高い会議での利用は [Gemini API 利用規約](https://ai.google.dev/gemini-api/terms) をご確認ください
- Chrome / Edge 以外のブラウザでは `MediaRecorder API` が動作しない場合があります
- Vercel Hobby プランではサーバーレス関数のタイムアウトが 60 秒のため、非常に長い音声の処理に時間がかかる場合があります

---

## ライセンス

[MIT](LICENSE)
