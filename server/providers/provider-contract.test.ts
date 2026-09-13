// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { CANVAS_TEMPLATES } from '../../constants';
import type { GenerateInput } from '../contracts';
import { GeminiAnalysisProvider } from './gemini-analysis-provider';
import { OpenAIAnalysisProvider } from './openai-analysis-provider';
import { createProvider } from './provider-factory';

const input: GenerateInput = { action: 'generate', canvasType: 'SWOT_ANALYSIS', userInput: 'Repair service', fileContent: '' };
const fixture = {
  canvasData: Object.fromEntries(CANVAS_TEMPLATES.SWOT_ANALYSIS.blocks.map((block) => [block.id, block.title])),
  analysisFeedback: { strengths: 'Coherent', suggestions: 'Validate assumptions' },
};

describe('analysis providers', () => {
  it('normalizes Gemini structured output', async () => {
    const generateContent = vi.fn().mockResolvedValue({ text: JSON.stringify(fixture) });
    const provider = new GeminiAnalysisProvider({ models: { generateContent } });
    await expect(provider.generate(input)).resolves.toEqual(fixture);
  });

  it('uses OpenAI Responses structured output without storage', async () => {
    const create = vi.fn().mockResolvedValue({ output_text: JSON.stringify(fixture) });
    const provider = new OpenAIAnalysisProvider({ responses: { create } });
    await expect(provider.generate(input)).resolves.toEqual(fixture);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ store: false }));
  });

  it('rejects malformed model output and missing configuration', async () => {
    const provider = new GeminiAnalysisProvider({ models: { generateContent: vi.fn().mockResolvedValue({ text: '{}' }) } });
    await expect(provider.generate(input)).rejects.toThrow();
    expect(() => createProvider({ AI_PROVIDER: 'openai' })).toThrow('OPENAI_API_KEY');
    expect(() => createProvider({ AI_PROVIDER: 'fake', NODE_ENV: 'production' })).toThrow('Unsupported AI_PROVIDER');
  });
});
