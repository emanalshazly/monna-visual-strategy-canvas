# Visual Strategy Canvas Generator

[Public demo](https://emanalshazly.github.io/monna-product-demos/visual-strategy-canvas/) provides an editable and exportable deterministic demonstration. It does not send model requests; live generation requires a separately operated server gateway and the operator's own provider access.

A reference implementation that turns a business description into an editable Business Model Canvas, SWOT, Porter's Five Forces, or Value Proposition Canvas. The React client calls a server-side analysis gateway; provider credentials are never bundled into browser code.

## Implemented

- Text, `.txt`, image, and browser speech input.
- Editable SVG canvas and deterministic PNG, JPEG, SVG, and PDF export paths.
- Schema-validated `generate` and `refine` operations through `/api/analysis`.
- Gemini server adapter and optional OpenAI Responses API adapter.
- Bounded request size, timeout, per-process rate limit, short-lived bounded cache, and safe error responses.
- Fixture-driven unit, contract, component, and Chromium E2E tests.

## Local development

Requires Node.js 22 and a Gemini or OpenAI API key.

```bash
npm ci
# PowerShell: Copy-Item .env.example .env.local
# POSIX shell: cp .env.example .env.local
npm run dev:server
npm run dev
```

The two development commands run in separate terminals. Vite proxies `/api` to port 3001.

## Validation

```bash
npm run check:secrets
npm run type-check
npm run lint
npm test
npm run build
npm run test:e2e
npm audit --audit-level=high
```

## Evidence boundary

Automated checks validate code structure, schemas, fixture behavior, exports in Chromium, compilation, and known dependency advisories. They do not prove that a generated strategy is correct, market-validated, professionally reviewed, or production-scaled. Live-provider behavior and a deployed runtime need separate receipts.

See [Deployment](DEPLOYMENT.md), [Operations](docs/operations.md), and [Security](SECURITY.md).

## Open contribution scope

Start with one reproducible defect in the brief-to-canvas-to-edit-to-export journey. Preserve supplied content and edits, validate provider output, and prove the final exported artifact. Use fictional briefs in public evidence. See [Contributing](CONTRIBUTING.md).

This repository is a curated application snapshot maintained by Eman Alshazly. It does not include private repository history, environment values or internal planning documents. It contains no MONNA framework source. The MIT license is retained in [LICENSE](LICENSE).

There is no funded contributor pool or payment promise. Any future Slop listing is subject to its maintainers' review; repository availability is not evidence of listing acceptance.
