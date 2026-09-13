# Contributing

Use Node.js 22 and create changes on a feature branch. Provider credentials belong only in an ignored `.env.local` file and must never use a `VITE_` prefix.

```bash
npm ci
Copy-Item .env.example .env.local # PowerShell
npm run dev:server
npm run dev
```

Before opening a pull request, run:

```bash
npm run check:secrets
npm run type-check
npm run lint
npm test
npm run build
npm run test:e2e
npm audit --audit-level=high
```

New model providers implement `AnalysisProvider` under `server/providers/` and must pass fixture-driven contract tests. New canvas types require a `CanvasType`, a template, server schema coverage, and deterministic tests. Do not add adoption, market-performance, validation, or production-readiness claims without evidence attached to the pull request.
