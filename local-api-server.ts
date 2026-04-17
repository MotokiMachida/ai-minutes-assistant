/**
 * ローカル開発用 API サーバー (port 3001)
 * Vite の proxy 設定と組み合わせて使用する
 */
import { readFileSync } from 'fs';
import express from 'express';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import generateHandler from './api/generate.js';
import analyzeAudioHandler from './api/analyze-audio.js';
import transcribeHandler from './api/transcribe.js';

// .env.local を手動ロード（handler が process.env を参照するより前に実行）
try {
  const content = readFileSync('.env.local', 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  }
} catch {
  console.warn('[local-api] .env.local が見つかりません');
}

const app = express();
app.use(express.json({ limit: '50mb' }));

app.post('/api/generate', (req, res) => {
  generateHandler(req as unknown as VercelRequest, res as unknown as VercelResponse);
});

app.post('/api/analyze-audio', (req, res) => {
  analyzeAudioHandler(req as unknown as VercelRequest, res as unknown as VercelResponse);
});

app.post('/api/transcribe', (req, res) => {
  transcribeHandler(req as unknown as VercelRequest, res as unknown as VercelResponse);
});

const PORT = 3001;
const server = app.listen(PORT, () => {
  console.log(`[local-api] http://localhost:${PORT} で起動しました`);
  console.log(`[local-api] GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? '設定済み' : '未設定'}`);
});

server.on('error', (err) => {
  console.error('[local-api] 起動エラー:', err);
  process.exit(1);
});

// プロセスを維持
process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
