# ============================================================
# ステージ 1: ビルド
#   Node.js で依存パッケージをインストールし、本番用バンドルを生成する
# ============================================================
FROM node:22-alpine AS builder

WORKDIR /app

# package.json / package-lock.json だけを先にコピーし、
# ソースコードの変更でキャッシュが無効化されないようにする
COPY package*.json ./
RUN npm ci

# ソースコード全体をコピー
COPY . .

# Gemini API キーをビルド時引数として受け取る
# （VITE_ プレフィックスの変数は vite build 時に JS バンドルへ埋め込まれる）
#
# ⚠️ セキュリティ注意:
#   ENV ではなく RUN 内でインライン展開することで、
#   docker history にキーが残らないようにする。
#   マルチステージビルドのため最終イメージには ENV 層が引き継がれない点も安全性を高める。
#   ただし VITE_ 変数の性質上、キーは dist/ の JS バンドルに埋め込まれる点は避けられない。
ARG VITE_GEMINI_API_KEY

# TypeScript コンパイル + Vite 本番ビルド（ARG をそのまま環境変数として渡す）
RUN VITE_GEMINI_API_KEY="$VITE_GEMINI_API_KEY" npm run build

# ============================================================
# ステージ 2: 配信
#   軽量な nginx イメージで dist/ フォルダを静的配信する
# ============================================================
FROM nginx:stable-alpine AS runner

# ビルド成果物だけをコピー（Node.js / node_modules は含まれない）
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA 向け nginx 設定（全ルートを index.html へフォールバック）
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
