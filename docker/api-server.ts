/**
 * Docker 開発用 Express サーバー
 *
 * - /api/transcribe, /api/generate → Vercel Function ハンドラーを直接呼び出す
 * - それ以外 → Vite 開発サーバー（port 5173）へプロキシ
 *
 * 起動: tsx docker/api-server.ts
 */

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import transcribeHandler from '../api/transcribe.js';
import generateHandler from '../api/generate.js';

const app = express();

// Vercel Functions の bodyParser 設定に合わせてサイズ上限を設定
app.use('/api/transcribe', express.json({ limit: '20mb' }));
app.use('/api/generate', express.json({ limit: '1mb' }));

// API ルート
app.post('/api/transcribe', (req, res) => {
  transcribeHandler(req as unknown as VercelRequest, res as unknown as VercelResponse);
});

app.post('/api/generate', (req, res) => {
  generateHandler(req as unknown as VercelRequest, res as unknown as VercelResponse);
});

// Vite 開発サーバーへのプロキシ（HMR WebSocket 含む）
app.use(
  '/',
  createProxyMiddleware({
    target: 'http://localhost:5173',
    changeOrigin: true,
    ws: true,
  }),
);

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`[docker] API server: http://localhost:${PORT}`);
  console.log('[docker] Proxying UI requests to Vite on http://localhost:5173');
});
