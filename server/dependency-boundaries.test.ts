// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { buildApp } from './app';
import { FakeAnalysisProvider } from './providers/fake-analysis-provider';

const validRequest = {
  action: 'generate',
  canvasType: 'SWOT_ANALYSIS',
  userInput: 'A fictional neighborhood repair service',
  fileContent: '',
};

describe('request boundaries across dependency updates', () => {
  it('rejects collection values at scalar fields before calling a provider', async () => {
    const provider = new FakeAnalysisProvider();
    const generate = vi.spyOn(provider, 'generate');
    const app = buildApp({ provider });
    try {
      for (const field of ['userInput', 'fileContent']) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/analysis',
          payload: { ...validRequest, [field]: Array.from({ length: 128 }, () => ({ invalid: true })) },
        });
        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({ code: 'invalid_request', message: 'Check the request fields.' });
      }
      expect(generate).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('rejects a JSON body over the transport budget before calling a provider', async () => {
    const provider = new FakeAnalysisProvider();
    const generate = vi.spyOn(provider, 'generate');
    const app = buildApp({ provider });
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/analysis',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({ ...validRequest, userInput: 'x'.repeat(12 * 1024 * 1024) }),
      });
      expect(response.statusCode).toBe(413);
      expect(generate).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
});
