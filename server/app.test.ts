// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildApp } from './app';
import { FakeAnalysisProvider } from './providers/fake-analysis-provider';
import { spawn } from 'node:child_process';

const request = { action: 'generate', canvasType: 'SWOT_ANALYSIS', userInput: 'A small repair service', fileContent: '' };

describe('analysis API', () => {
  it('releases the timeout after completed generation, refinement, and provider failure', async () => {
    for (const mode of ['generate', 'refine', 'failure']) {
      const source = `
        import { buildApp } from './server/app.ts';
        import { FakeAnalysisProvider } from './server/providers/fake-analysis-provider.ts';
        const provider = new FakeAnalysisProvider();
        if (${JSON.stringify(mode)} === 'failure') provider.generate = async () => { throw new Error('fictional failure'); };
        const app = buildApp({ provider, timeoutMs: 30_000 });
        const payload = ${JSON.stringify(mode)} === 'refine'
          ? { action: 'refine', blockTitle: 'Strengths', currentContent: 'Fictional content', originalUserInput: 'Fictional repair service' }
          : ${JSON.stringify(request)};
        const response = await app.inject({ method: 'POST', url: '/api/analysis', payload });
        await app.close();
        console.log(response.statusCode);
      `;
      const expected = mode === 'failure' ? '502' : '200';
      const result = await new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
        const child = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', source], {
          cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'test' },
        });
        let stdout = '', stderr = '';
        let shutdown: ReturnType<typeof setTimeout> | undefined;
        const startup = setTimeout(() => { child.kill(); reject(new Error(`${mode}: child did not finish its request: ${stderr}`)); }, 20_000);
        child.stdout.on('data', (chunk) => {
          stdout += chunk.toString();
          if (stdout.trim() === expected && shutdown === undefined) {
            clearTimeout(startup);
            shutdown = setTimeout(() => { child.kill(); reject(new Error(`${mode}: completed request retained the process`)); }, 2_000);
          }
        });
        child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
        child.on('error', (error) => { clearTimeout(startup); clearTimeout(shutdown); reject(error); });
        child.on('close', (status) => { clearTimeout(startup); clearTimeout(shutdown); resolve({ status, stdout, stderr }); });
      });
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout.trim()).toBe(expected);
    }
  }, 75_000);
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
