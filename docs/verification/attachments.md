# Generate with the current completed attachment context

Base: `61a2067cce2d658094be73caaea2e05c67c4f63a`.

An older text/image read can replace the latest selected attachment. An older
image callback can also restore an image after its removal. Starting generation
before a selected file finishes reading sends missing context. A stale text
callback can clear the error from a more recent rejected selection.

These are reproduced brief-input defects. The proof is the actual JSON body
submitted by the browser to the local gateway, not an inference from a model's
answer. The gateway uses the built-in **deterministic fake provider** and may
return a cached fixture. Its canned canvas does not establish strategy quality
or whether a real model would use the context.

## Fix

Each attachment type has a read revision and loading state. A selection, even a
rejected/cleared selection, supersedes older reads of that type. Only the current
reader may commit bytes, finish loading or change the error. Removing an image
also invalidates its earlier readers. Generation stays disabled while a current
document/image read is pending, with a `Reading attachments...` status; the
handler also checks readiness. Native read failure/abort ends the current
loading state and reports an error. A completed prior attachment is retained
until another valid read succeeds or the image is explicitly removed.

The change is limited to `App.tsx` and `components/ControlsPanel.tsx` in production.
The existing component-test fixture supplies the new readiness prop as false;
its assertions are unchanged. This main-based branch includes none of #4/#5/#6/
#7/#8/#9/#10. Shared `App.tsx` edits need ordinary integration review. It does
not change template ownership, refinement, storage, regeneration retention,
provider logic or export encoding.

## Matched evidence

The identical final Playwright file and committed Bun launcher ran against
original production source and the fixed source:

| Workflow | Base | Fixed |
| --- | --- | --- |
| Older document callback after a newer selection | Old document submitted | Latest document submitted |
| Older image callback after a newer selection | Old PNG submitted | Latest PNG submitted |
| Remove the newer image, then deliver the older read | Removed image returns and is submitted | No image submitted |
| Generate while document/image callback is pending (two cases) | Early request omits selected context | No early request; completed selection submitted |
| Reject a newer document, then deliver the older read | Older text submitted; newer error cleared | Older read ignored; rejection stays visible |
| Native document/image abort followed by a valid retry (two cases) | Abort has no failure feedback | Failure shown; valid replacement generates/exports |
| Ordinary document/image reads (two controls) | Pass | Pass |

Base: **8 fail, 2 controls pass**. Fixed: **10 pass**. Full Chromium suite:
**14 pass**, no skips/retries. Existing unit suite: **16 pass**.

Files are written to disk and selected through the real browser file inputs.
The test wrappers call native `FileReader.readAsText`/`readAsDataURL`; they hold
and later deliver the actual trusted `onload` callback/event/result to make
the ordering deterministic. This is deliberate notification scheduling,
not a measured filesystem slowdown. No file bytes or provider responses are
fabricated. The abort cases invoke the actual native `abort()` while the
reader is `LOADING`, and observe `DONE` before the valid retry. No OS-level
read error was produced.

Each stage completes **10 SVG downloads** after real gateway HTTP200 responses
and a manually saved fictional edit. All downloaded bytes parse as SVG XML,
contain nine actual blocks and preserve the exact edit
`Fictional attachment check: "current context" & <shared tools>.`
The SVG checks establish that editing/export remains usable; the submitted
request establishes attachment correctness. PNG fixtures are generated 1x1 RGB
images, decoded by Chromium's real image element. No photographs, microphone,
live model or provider credentials are used.

[results.json](attachments/results.json) retains all request bodies/receipts,
expected context, native read and abort observations, original premature
requests, source/input/download hashes, and check outcomes. Two actual exports
are retained as [base](attachments/before-workflow.svg) and
[fixed](attachments/after-workflow.svg) samples. The existing style/paint defect
in #9 is outside this content/structure evidence.

## Reproduce

With existing dependencies and Bun on PATH, from the repository root:

```sh
bun run test:e2e --config verification/attachments.playwright.config.ts \
  tests/e2e/attachment-context.spec.ts --reporter=line
bun run test:e2e --config verification/attachments.playwright.config.ts \
  --reporter=line
bun run check:secrets
bun run type-check
bun run lint
bun run test
bun audit --audit-level=high
node verification/attachment-evidence.mjs
git diff --check
```

The launcher builds client/server with Bun, starts an owned fixture server on
`127.0.0.1:3001`, and refuses to reuse another process. The default npm-based
launcher is overridden. Every test writes `observations.json`, original input
files and the completed SVG to its Playwright output directory.

To reproduce the original failure in a disposable clean checkout, retain the
final test/verification files but substitute both production files from the
base above. The focused command should report eight failures and two controls.
Restore the fixed files before checking the fixed result.

Secret/type/lint, both builds, unit and browser checks pass. Required audit
exits1 with the same **four existing advisories (one critical, three high)**;
package manifests/lockfile are unchanged. The packet verifier checks source
and sample digests plus recorded request/readiness/export outcomes; it does
not replace rerunning browser execution.

Observed runtime: macOS 15.7.7 arm64, Node24.3.0, Bun1.4.4,
Playwright1.62.1/Chromium151.0.7922.34. Hosted CI, live model behavior, other
browsers/physical devices, real filesystem latency, PNG/JPEG/PDF appearance
and cross-template/persistence behavior were **NOT RUN/claimed**.
