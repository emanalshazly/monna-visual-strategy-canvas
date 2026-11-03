# Preserve the completed canvas during unsuccessful regeneration

On base `61a2067cce2d658094be73caaea2e05c67c4f63a`, generate a Business
Model Canvas, save a manual edit, then try generating again. Cancelling,
receiving a gateway rejection, or losing the response clears the saved canvas
and analysis. Export is no longer available. The application has no reload
persistence or undo that recovers this work.

`App.tsx` cleared both states before awaiting the replacement. It now keeps
them until a successful generation result replaces them. While the request is
pending, the existing loading screen still appears, analysis is hidden, and
export is unavailable because the canvas capture element is not mounted.
There is no rollback copy or new persistence mechanism.

This repairs a reproduced brief/edit/export workflow defect under the approved
project scope. All other production files and dependencies remain at the base.
The branch includes none of the other pending PRs. In particular, template
ownership (#4), storage quota (#6), and export paint (#9) have separate fixes;
this evidence concerns regeneration of the same canvas type. The shared
`App.tsx` changes need to be considered when integrating #4/#6.

## Matched before/after evidence

The same final regression file ran against original production source and the
fixed source. Both runs used an owned local Fastify gateway and its built-in
**deterministic fake provider**, with identical Bun build/start commands.
No live Gemini/OpenAI provider call or paid service was used.

| Workflow | Base | Fixed |
| --- | --- | --- |
| Cancel a replacement after the actual gateway response is held | Saved edit, analysis and export lost | All retained |
| Submit a 10,001-character fictional brief; actual gateway returns HTTP 400 | Same loss | All retained |
| Interrupt response delivery after actual gateway success | Same loss | All retained |
| Allow a successful replacement | New content replaces old edit; export passes | Same valid behavior |
| Reject the first generation, then retry normally | Empty state, then generation/export passes | Same valid behavior |

The first three base cases fail all six preservation assertions. The two
controls pass. All five fixed cases pass. The interruption is an explicit
Playwright `connectionreset` fault, not an observed external network outage.
Cancellation delays delivery with `route.fetch()` and then fulfills that same
response; it does not fabricate a provider response.

Before each replacement, the browser saves the fictional edit
`Fictional bicycle co-op: keep "weekly repairs" & <shared tools>.` through the
real editor and completes an SVG download. The tests read the completed bytes,
parse them with `DOMParser`, reject XML errors, and check the root namespace,
nine actual canvas blocks and paragraph text. After each unsuccessful fixed
attempt, **all nine blocks** match their saved content and the analysis text
also matches. Successful replacement removes the old edit and exports the
new content.

The matched base run completed six SVG downloads; the fixed run completed
nine. [results.json](regeneration/results.json) retains all five observations
per stage, actual gateway responses, outcomes, download sizes/digests, and
four source hashes. Two unmodified completed downloads are included:
[saved edit on base](regeneration/baseline-saved-edit.svg) and
[same edit after cancellation with the fix](regeneration/preserved-after-cancel.svg).
These samples establish structure/content, not paint or readability: the
existing export style defect addressed by #9 remains outside this change.

## Reproduce

Use an otherwise clean checkout with the existing dependencies and Bun on PATH:

```sh
bun run test:e2e --config verification/regeneration.playwright.config.ts \
  tests/e2e/regeneration-preservation.spec.ts --reporter=line
bun run test:e2e --config verification/regeneration.playwright.config.ts \
  --reporter=line
```

The committed launcher runs `bun run build:client`, `bun run build:server`,
and `bun run start:test`, binds `127.0.0.1:3001`, and refuses to reuse another
server. It overrides the default launcher's npm command. The recorded matched
runs used an external launcher with those same commands; the committed
launcher was then independently run through the full suite.

To reproduce the negative result, in a **disposable clean checkout** retain
the test/launcher and substitute only `App.tsx` from the base revision above.
The focused command should report three failures and two passing controls.
Restore the fixed `App.tsx` before repeating the fixed run. Each test writes
`observations.json` and actual downloads into its Playwright output directory.

Required checks executed on the fixed source:

```sh
bun run check:secrets
bun run type-check
bun run lint
bun run test
bun run build:client
bun run build:server
bun run test:e2e --config verification/regeneration.playwright.config.ts
bun audit --audit-level=high
git diff --check
```

Secret/type/lint checks and both builds pass. Unit tests: **16 passed**.
Full Chromium suite: **9 passed**, no skips/retries. The dependency audit exits
1 with **four existing advisories (one critical, three high)**; manifests and
lockfile are unchanged. No dependency upgrade is included.

Observed runtime: macOS 15.7.7 arm64, Node 24.3.0, Bun 1.4.4,
Playwright 1.62.1, Chromium 151.0.7922.34. Live-provider strategy quality,
hosted CI, other browsers, persistence across reload, cross-template ownership,
and PNG/JPEG/PDF appearance were **not verified** by this packet.
