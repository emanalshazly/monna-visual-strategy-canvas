import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyzeAndGenerateCanvas, refineBlockContent } from './analysisClient';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('analysis client', () => {
  it('normalizes generation and refinement responses', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ kind: 'generate', result: { canvasData: { strengths: 'Local trust' }, analysisFeedback: { strengths: 'Clear', suggestions: 'Test' } }, receipt: { requestId: '1', provider: 'fake', cached: false, durationMs: 1 } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ kind: 'refine', text: 'Refined text', receipt: { requestId: '2', provider: 'fake', cached: false, durationMs: 1 } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(analyzeAndGenerateCanvas('SWOT_ANALYSIS' as never, 'Idea', '')).resolves.toMatchObject({ canvasData: { strengths: 'Local trust' } });
    await expect(refineBlockContent('Strengths', 'Trust', 'Idea')).resolves.toBe('Refined text');
  });

  it('supports cancellation and surfaces safe server errors', async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal('fetch', vi.fn((_url, options) => {
      if (options?.signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
      return Promise.resolve(new Response('{}'));
    }));
    await expect(analyzeAndGenerateCanvas('SWOT_ANALYSIS' as never, 'Idea', '', undefined, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Try again later.' }), { status: 429 })));
    await expect(analyzeAndGenerateCanvas('SWOT_ANALYSIS' as never, 'Idea', '')).rejects.toThrow('Try again later.');
  });

  it('builds a complete deterministic Pages demo without calling the gateway', async () => {
    vi.stubEnv('VITE_GITHUB_PAGES_DEMO', 'true');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = await analyzeAndGenerateCanvas('SWOT_ANALYSIS' as never, 'Local repair service', '');
    expect(result.receipt.provider).toBe('deterministic-demo');
    expect(Object.keys(result.canvasData)).toEqual(['strengths', 'weaknesses', 'opportunities', 'threats']);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
