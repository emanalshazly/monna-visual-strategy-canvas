// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { CANVAS_TEMPLATES } from '../constants';
import { buildApp } from './app';
import { generationResultSchema, type GenerateInput } from './contracts';
import { FakeAnalysisProvider } from './providers/fake-analysis-provider';

const generate = { action: 'generate', canvasType: 'SWOT_ANALYSIS', userInput: 'A small repair service', fileContent: '' };
const blockIds = CANVAS_TEMPLATES.SWOT_ANALYSIS.blocks.map((block) => block.id);
const feedback = { strengths: '• Clear niche', suggestions: '• Interview customers' };
const post = (app: ReturnType<typeof buildApp>, payload: unknown) => app.inject({ method: 'POST', url: '/api/analysis', payload: payload as never });

function providerReturning(canvasData: Record<string, string>, analysisFeedback = feedback) {
  const provider = new FakeAnalysisProvider();
  provider.generate = async () => ({ canvasData, analysisFeedback });
  return provider;
}

describe('generated analysis output validation', () => {
  it('accepts complete content and keeps it unchanged', async () => {
    const content = Object.fromEntries(blockIds.map((id) => [id, `  • ${id} point  `]));
    const app = buildApp({ provider: providerReturning(content) });
    const response = await post(app, generate);
    expect(response.statusCode).toBe(200);
    expect(response.json().result.canvasData).toEqual(content);
    await app.close();
  });

  it.each([
    ['an empty block', { ...Object.fromEntries(blockIds.map((id) => [id, 'Filled'])), [blockIds[0]]: '' }],
    ['a whitespace-only block', { ...Object.fromEntries(blockIds.map((id) => [id, 'Filled'])), [blockIds[1]]: ' \n\t ' }],
    ['every block blank', Object.fromEntries(blockIds.map((id) => [id, '   ']))],
  ])('rejects %s as invalid provider output', async (_name, canvasData) => {
    const app = buildApp({ provider: providerReturning(canvasData) });
    const response = await post(app, generate);
    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({ code: 'provider_error', message: 'Strategy analysis is temporarily unavailable.' });
    await app.close();
  });

  it.each([
    ['blank strengths', { strengths: '  ', suggestions: 'Validate' }],
    ['blank suggestions', { strengths: 'Clear', suggestions: '' }],
  ])('rejects %s in the analysis feedback', async (_name, analysisFeedback) => {
    const app = buildApp({ provider: providerReturning(Object.fromEntries(blockIds.map((id) => [id, 'Filled'])), analysisFeedback) });
    expect((await post(app, generate)).statusCode).toBe(502);
    await app.close();
  });

  it('does not cache rejected output', async () => {
    let calls = 0;
    const provider = new FakeAnalysisProvider();
    provider.generate = async () => { calls += 1; return { canvasData: Object.fromEntries(blockIds.map((id) => [id, ''])), analysisFeedback: feedback }; };
    const app = buildApp({ provider });
    await post(app, generate);
    await post(app, generate);
    expect(calls).toBe(2);
    await app.close();
  });

  it('applies the same rule to the shared result schema used by every provider', () => {
    const complete = { canvasData: Object.fromEntries(blockIds.map((id) => [id, 'Filled'])), analysisFeedback: feedback };
    expect(generationResultSchema.safeParse(complete).success).toBe(true);
    expect(generationResultSchema.safeParse({ ...complete, canvasData: { ...complete.canvasData, [blockIds[0]]: ' ' } }).success).toBe(false);
  });
});

describe('image payload validation', () => {
  const image = (data: string) => ({ ...generate, image: { data, mimeType: 'image/png' } });
  const seen: GenerateInput[] = [];
  const spyProvider = () => {
    const provider = new FakeAnalysisProvider();
    const original = provider.generate.bind(provider);
    provider.generate = async (input) => { seen.push(input); return original(input); };
    return provider;
  };

  it('passes well-formed base64 to the provider', async () => {
    seen.length = 0;
    const app = buildApp({ provider: spyProvider() });
    const response = await post(app, image('iVBORw0KGgo='));
    expect(response.statusCode).toBe(200);
    expect(seen).toHaveLength(1);
    expect(seen[0].image?.data).toBe('iVBORw0KGgo=');
    await app.close();
  });

  it('accepts the maximum-size image without exhausting the regex stack', async () => {
    seen.length = 0;
    const app = buildApp({ provider: spyProvider() });
    const response = await post(app, image('QUJD'.repeat(2_000_000)));
    expect(response.statusCode).toBe(200);
    expect(seen).toHaveLength(1);
    await app.close();
  });

  it.each([
    ['non-base64 characters', 'this is !!! not base64 ***'],
    ['padding that is too long', 'QUJDQ==='],
    ['only padding', '===='],
    ['a data URL prefix', 'data:image/png;base64,iVBORw0KGgo='],
    ['a length that is not a multiple of four', 'iVBORw0KGgoAA'],
    ['padding in the middle', 'iVBO=w0KGgo='],
    ['whitespace inside the data', 'iVBO Rw0K Ggo='],
  ])('rejects %s before calling the provider', async (_name, data) => {
    seen.length = 0;
    const app = buildApp({ provider: spyProvider() });
    const response = await post(app, image(data));
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ code: 'invalid_request', message: 'Check the request fields.' });
    expect(seen).toHaveLength(0);
    await app.close();
  });
});
