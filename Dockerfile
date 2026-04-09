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
# （VITE_ プレフィックスの環境変数は vite build 時にバンドルへ埋め込まれる）
ARG VITE_GEMINI_API_KEY
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY

# TypeScript コンパイル + Vite 本番ビルド
RUN npm run build

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
