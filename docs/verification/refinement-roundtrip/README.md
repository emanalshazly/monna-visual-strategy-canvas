# Reuse a successful refinement as the next refinement request

Base: `61a2067cce2d658094be73caaea2e05c67c4f63a`.

The API accepts refinement responses up to 20,000 characters but admitted only
10,000 characters as the next request's currentContent. A valid 10,000-character
draft refined by the existing deterministic provider becomes 10,009 characters;
the UI displays that successful response, then its next refinement fails with
HTTP 400. The same failure occurs through the real browser/editor on desktop
and a mobile viewport, without modifying FileReader, fetch or the provider.

Use the existing 20,000-character refinement ceiling for both directions.
The generated-canvas field limit and original business-description limit stay
unchanged. Inputs of 20,001 characters and provider replies over the existing
ceiling still fail. No truncation or new model capability is introduced.

## Evidence

`before-1280.png` / `before-393.png` and their WebM recordings show the rejected
second refinement. The corresponding `after-*` artifacts show the successful
flow. Both completed `export-*.svg` downloads were saved as bytes, parsed with
DOMParser without parser errors, and checked for all four SWOT blocks and the
exact twice-refined draft. Only fictional repair-cooperative content is used.

The new E2E test drives the real local Fastify gateway with its existing fake
provider. It does not intercept API responses. It fills the editor, refines
twice, saves, downloads SVG and checks the completed file. This is contract and
workflow evidence, not proof of live-model strategy quality. Live-provider
checks: **NOT RUN**.

## Reproduce

Use the pinned package lock and run the repository checks:

```sh
npm ci
npm run check:secrets
npm run type-check
npm run lint
npm test
npm run build
npm run test:e2e
npm audit --audit-level=high
```

Measured locally with Node 24.15.0 on Windows, Playwright 1.62.1 and the already
installed Chromium 156.0.8078.4 (build 1248). A temporary launcher override used
`127.0.0.1:3108`, disabled server reuse and recorded videos; no override is
committed to the product. The ordinary test configuration remains portable.

The same two browser cases fail at the HTTP status assertion before the fix
and pass afterward. All six E2E cases and all 17 unit/contract tests pass.
Secret checking, type checking, lint and both builds also pass. The dependency
audit **fails** with the existing, unchanged lockfile's advisories; see
`validation.json` for severity counts and the lockfile digest. No dependency
change or hosted CI success is claimed. Other open generation, storage,
editing-race and export-style PRs are separate outcomes.
