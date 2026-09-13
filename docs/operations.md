# Operations

- Health: `GET /healthz`
- Analysis: `POST /api/analysis`
- Default port: `3001`
- Build: `npm run build`
- Start: `npm start`

The cache is local, bounded to 100 successful generation results, and expires entries after ten minutes by default. Refinement responses are not cached. Restarting the process clears both cache and rate-limit state.

Release gates:

1. Complete the README validation commands on a clean clone.
2. Run live generation and refinement smoke tests for the selected provider without recording private inputs or secrets.
3. Review desktop/mobile layout, keyboard editing, export downloads, provider failures, and cancellation.
4. Verify centralized controls, monitoring, retention, secret rotation, and rollback in the target environment.

Until those receipts exist, use “reference implementation,” not “production ready.”
