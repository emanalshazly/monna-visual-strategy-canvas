// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildApp } from './app';
import { FakeAnalysisProvider } from './providers/fake-analysis-provider';

const request = { action: 'generate', canvasType: 'SWOT_ANALYSIS', userInput: 'A small repair service', fileContent: '' };

describe('analysis API', () => {
  it('returns schema-valid deterministic analysis and a cache receipt', async () => {
    const app = buildApp({ provider: new FakeAnalysisProvider() });
    const first = await app.inject({ method: 'POST', url: '/api/analysis', payload: request });
    const second = await app.inject({ method: 'POST', url: '/api/analysis', payload: request });
    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({ kind: 'generate', receipt: { provider: 'fake', cached: false } });
    expect(second.json()).toMatchObject({ receipt: { cached: true } });
    await app.close();
  });

  it('rejects invalid input and rate limits by client', async () => {
    const app = buildApp({ provider: new FakeAnalysisProvider(), maxRequests: 1 });
    expect((await app.inject({ method: 'POST', url: '/api/analysis', payload: { ...request, userInput: '' } })).statusCode).toBe(400);
    expect((await app.inject({ method: 'POST', url: '/api/analysis', payload: request })).statusCode).toBe(429);
    await app.close();
  });

  it('maps provider failure and timeout to safe errors', async () => {
    const failing = new FakeAnalysisProvider();
    failing.generate = async () => { throw new Error('secret provider detail'); };
    const failureApp = buildApp({ provider: failing });
    const failure = await failureApp.inject({ method: 'POST', url: '/api/analysis', payload: request });
    expect(failure.statusCode).toBe(502);
    expect(failure.body).not.toContain('secret provider detail');
    await failureApp.close();

    const slow = new FakeAnalysisProvider();
    slow.generate = () => new Promise(() => undefined);
    const timeoutApp = buildApp({ provider: slow, timeoutMs: 5 });
    expect((await timeoutApp.inject({ method: 'POST', url: '/api/analysis', payload: request })).statusCode).toBe(502);
    await timeoutApp.close();
  });

  it('supports refinement through the same normalized route', async () => {
    const app = buildApp({ provider: new FakeAnalysisProvider() });
    const response = await app.inject({ method: 'POST', url: '/api/analysis', payload: { action: 'refine', blockTitle: 'Strengths', currentContent: 'Local trust', originalUserInput: 'Repair service' } });
    expect(response.json()).toMatchObject({ kind: 'refine', text: 'Refined: Local trust' });
    await app.close();
  });
});
