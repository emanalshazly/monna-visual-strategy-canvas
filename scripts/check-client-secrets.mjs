import { globSync, readFileSync } from 'node:fs';

const candidates = ['App.tsx', 'types.ts', 'vite.config.ts', ...globSync('components/**/*.{ts,tsx}'), ...globSync('services/**/*.{ts,tsx}')];
const forbidden = /VITE_API_KEY|GEMINI_API_KEY|OPENAI_API_KEY|process\.env\.API_KEY|from\s+["'](?:@google\/genai|openai)["']/;
const violations = candidates.filter((file) => forbidden.test(readFileSync(file, 'utf8')));

if (violations.length) {
  console.error(`Client credential/provider references: ${violations.join(', ')}`);
  process.exit(1);
}

console.log('PASS: no client credential or provider SDK references.');
