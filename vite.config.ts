/// <reference types="vitest" />
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      base: process.env.GITHUB_PAGES === 'true'
        ? process.env.GITHUB_PAGES_BASE || '/Visual-Strategy-Canvas-Generator/'
        : '/',
      plugins: [react()],
      server: {
        proxy: { '/api': 'http://localhost:3001' },
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      test: {
        globals: true,
        testTimeout: 15000,
        environment: 'jsdom',
        setupFiles: './tests/setup.ts',
        exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
        css: true,
        coverage: {
          provider: 'v8',
          reporter: ['text', 'json', 'html', 'lcov'],
          exclude: [
            'node_modules/',
            'tests/',
            '**/*.d.ts',
            '**/*.config.*',
            '**/dist/',
            '**/coverage/',
          ],
        },
      },
    };
});
