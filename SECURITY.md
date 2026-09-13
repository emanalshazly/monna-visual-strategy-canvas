# Security policy

Report vulnerabilities privately through GitHub Security Advisories. Do not post keys, private business descriptions, uploaded documents, images, or generated canvases in public issues.

## Implemented controls

- Provider credentials load only in the Node server.
- Browser sources are scanned for provider keys and direct provider SDK imports.
- Request and provider output schemas are validated.
- Request body size, history-free operation contracts, provider timeout, in-memory rate limiting, and bounded cache are enforced.
- Server errors returned to users do not include provider internals or prompt content.

## Operator responsibilities

The in-memory rate limiter and cache are single-process controls. Multi-instance deployments require shared stores and deliberate proxy trust. Define retention, data residency, access control, abuse monitoring, incident response, and provider settings before accepting confidential strategy material.
