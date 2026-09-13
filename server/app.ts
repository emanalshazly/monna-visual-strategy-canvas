import { createHash } from 'node:crypto';
import Fastify from 'fastify';
import { CANVAS_TEMPLATES } from '../constants.js';
import { analysisRequestSchema, generationResultSchema, type AnalysisProvider, type GenerationResult } from './contracts.js';

type AppOptions = {
  provider: AnalysisProvider;
  maxRequests?: number;
  windowMs?: number;
  timeoutMs?: number;
  cacheTtlMs?: number;
  cacheSize?: number;
};

function validateGeneration(canvasType: string, value: GenerationResult) {
  const parsed = generationResultSchema.parse(value);
  const expected = new Set(CANVAS_TEMPLATES[canvasType].blocks.map((block) => block.id));
  const actual = Object.keys(parsed.canvasData);
  if (actual.length !== expected.size || actual.some((key) => !expected.has(key))) throw new Error('invalid_provider_output');
  return parsed;
}

export function buildApp({ provider, maxRequests = 20, windowMs = 60_000, timeoutMs = 30_000, cacheTtlMs = 10 * 60_000, cacheSize = 100 }: AppOptions) {
  const app = Fastify({ logger: process.env.NODE_ENV === 'production', bodyLimit: 12 * 1024 * 1024 });
  const clients = new Map<string, { count: number; resetAt: number }>();
  const cache = new Map<string, { expiresAt: number; value: GenerationResult }>();

  app.get('/healthz', async () => ({ status: 'ok', provider: provider.name }));

  app.post('/api/analysis', async (request, reply) => {
    const startedAt = Date.now();
    const current = clients.get(request.ip);
    const bucket = !current || current.resetAt <= startedAt ? { count: 0, resetAt: startedAt + windowMs } : current;
    bucket.count += 1;
    clients.set(request.ip, bucket);
    if (bucket.count > maxRequests) return reply.code(429).send({ code: 'rate_limited', message: 'Try again later.' });

    const parsed = analysisRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ code: 'invalid_request', message: 'Check the request fields.' });

    const cacheKey = parsed.data.action === 'generate'
      ? createHash('sha256').update(JSON.stringify(parsed.data)).digest('hex')
      : null;
    const cached = cacheKey ? cache.get(cacheKey) : undefined;
    if (cached && cached.expiresAt > startedAt) {
      return reply.send({ kind: 'generate', result: cached.value, receipt: { requestId: request.id, provider: provider.name, cached: true, durationMs: Date.now() - startedAt } });
    }

    try {
      const operation = parsed.data.action === 'generate'
        ? provider.generate(parsed.data)
        : provider.refine(parsed.data);
      const value = await Promise.race([
        operation,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('provider_timeout')), timeoutMs)),
      ]);
      const receipt = { requestId: request.id, provider: provider.name, cached: false, durationMs: Date.now() - startedAt };
      if (parsed.data.action === 'refine') return reply.send({ kind: 'refine', text: zText(value), receipt });

      const result = validateGeneration(parsed.data.canvasType, value as GenerationResult);
      if (cacheKey) {
        if (cache.size >= cacheSize) cache.delete(cache.keys().next().value as string);
        cache.set(cacheKey, { expiresAt: startedAt + cacheTtlMs, value: result });
      }
      return reply.send({ kind: 'generate', result, receipt });
    } catch (error) {
      request.log.error({ requestId: request.id, provider: provider.name, code: error instanceof Error ? error.message : 'provider_error', durationMs: Date.now() - startedAt }, 'analysis request failed');
      return reply.code(502).send({ code: 'provider_error', message: 'Strategy analysis is temporarily unavailable.' });
    }
  });

  return app;
}

function zText(value: unknown) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 20_000) throw new Error('invalid_provider_output');
  return value;
}
