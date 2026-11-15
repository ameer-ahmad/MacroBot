import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Standalone test config so the app's PWA/SSL plugins don't load during tests.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'server/**/*.test.ts'],
  },
})
