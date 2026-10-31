import { fileURLToPath } from 'node:url';
import base from '../playwright.config';

export default {
  ...base,
  testDir: fileURLToPath(new URL('../tests/e2e', import.meta.url)),
  webServer: {
    command: 'bun run build:client && bun run build:server && bun run start:test',
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    url: 'http://localhost:3001/healthz',
    env: { HOST: '127.0.0.1', PORT: '3001' },
    reuseExistingServer: false,
  },
};
