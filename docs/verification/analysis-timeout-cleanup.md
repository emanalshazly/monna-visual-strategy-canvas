# Completed analysis request timeout cleanup

Base: `61a2067cce2d658094be73caaea2e05c67c4f63a`.

Each analysis request starts a provider timeout, but the timer was retained
after the provider settled. Closing a local application after a successful
request therefore left the process alive until the original deadline. Immediate
provider failures retained the same timer. Each completed request kept its
timeout callback until that deadline.

The new regression runs the actual Fastify route in isolated Node processes,
using the repository's deterministic provider. Generation, refinement and
provider rejection must return the expected HTTP status, close the application,
and allow the process to exit within two seconds after printing the status while
the request deadline is thirty seconds. A separate twenty-second startup budget
allows cold module loading. On the base, the generation case prints HTTP 200 but
fails the shutdown check (`completed request retained the process`); after the
fix all three processes exit normally. The
existing pending-provider case still returns the timeout error.

The timer is now cleared in `finally` after provider success, failure, validation
failure or timeout. This changes timer lifetime, not provider output, the deadline,
or request/response limits. Cancellation of a provider's underlying operation is
outside this change.

Executed locally on Windows / Node v24.15.0, with the final full unit suite also
passing on the repository's requested Node v22.23.4:

| Check | Result |
| --- | --- |
| New regression on base, Node 22 | FAIL: HTTP 200 received, child retained after 2 s |
| `npm test` after fix | PASS: 17 tests, 6 files |
| `npm run check:secrets` | PASS |
| `npm run type-check` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS: client and server |
| `npm run test:e2e` with local launcher | PASS: 4 Chromium cases |
| Completed SVG download control | PASS: 36,078 bytes, XML root `svg`, 0 parser errors, exact saved edit retained |
| `npm audit --audit-level=high` | FAIL on unchanged lock: 22 findings (1 low, 18 moderate, 2 high, 1 critical) |

The local E2E launcher selected the already installed Chromium at
`ms-playwright/chromium-1248` and localhost port 3118; the product's default
configuration was unchanged. The separate completed-download control used the
real local Fastify server on port 3120, edited Key Partners, saved the SVG bytes,
and parsed the downloaded XML. Both used fictional content and the existing
deterministic provider. The dependency lock SHA-256 was unchanged:
`59c0103c491f87347fb658c91d281258a6ebd530e80378e452f653e8ff0dca6f`.

Live-provider checks and hosted CI: NOT RUN. These checks do not establish model
quality, production readiness, or an all-green dependency audit.
