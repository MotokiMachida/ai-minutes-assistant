import { defineConfig } from 'vitest/config' 
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// もし Vitest を使っているなら、三斜線ディレクティブをファイルの先頭に追加します
/// <reference types="vitest" />
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 'test' プロパティにエラーが出る場合は、
  // 1. Vitest用の型定義を読み込む（上記）
  // 2. あるいは、一旦不要であれば削除またはコメントアウトする
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
