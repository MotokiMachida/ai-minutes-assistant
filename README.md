# AI 議事録アシスタント

ブラウザの音声認識でリアルタイムに文字起こしし、Gemini AI が要約・ToDo・決定事項を自動生成する議事録作成ツールです。

## 機能

- マイクからリアルタイム文字起こし（Web Speech API）
- 会議内容の要約・ToDo・決定事項を AI が自動抽出
- Vercel にワンコマンドでデプロイ可能

## 技術スタック

- **フロントエンド**: React 19 + TypeScript + Vite + Tailwind CSS
- **音声認識**: Web Speech API（ブラウザ内蔵）
- **AI 分析**: Google Gemini API（`gemini-2.5-flash`）
- **ホスティング**: Vercel

## セットアップ

### 必要なもの

- Node.js 18 以上
- Google Gemini API キー（[aistudio.google.com](https://aistudio.google.com/apikey) で取得）

### インストール

```bash
npm install
```

### 環境変数

`.env.local` を作成して API キーを設定します：

```
GEMINI_API_KEY=your_api_key_here
```

## 開発

### ローカル開発（推奨）

Vite + ローカル API サーバーを同時起動します：

```bash
npm run dev:local
```

- フロントエンド: http://localhost:5173
- API サーバー: http://localhost:3001

### Vercel Dev

```bash
npm run dev:api
```

## デプロイ

```bash
# Vercel CLI をインストール
npm i -g vercel

# プロジェクトをリンク
vercel link

# 環境変数を追加
vercel env add GEMINI_API_KEY production

# デプロイ
vercel --prod
```

または Vercel ダッシュボードの **Settings > Environment Variables** から `GEMINI_API_KEY` を設定後、GitHub に push すると自動デプロイされます。

## 注意事項

- Web Speech API は Chrome / Edge での使用を推奨（Safari は部分対応）
- Gemini API の無料枠（[aistudio.google.com](https://aistudio.google.com/apikey) 発行のキー）で動作します
