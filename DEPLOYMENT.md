# Deployment contract

This application is not a static-only site: the Fastify gateway must run beside the compiled browser assets.

## Container

```bash
docker build -t visual-strategy-canvas .
docker run --rm -p 3001:3001 --env-file .env.local visual-strategy-canvas
```

`AI_PROVIDER=gemini` requires `GEMINI_API_KEY`. `AI_PROVIDER=openai` requires `OPENAI_API_KEY`. Never pass provider keys as Docker build arguments or `VITE_` variables.

Before production deployment, supply centralized rate limiting and caching, authentication/quotas where appropriate, TLS, secret rotation, logging/retention rules, monitoring, backup/rollback procedures, and a live smoke-test receipt for each enabled operation. No deployment is evidenced by this repository alone.
