import { Type } from '@google/genai';
import { generationResultSchema, type AnalysisProvider, type GenerateInput, type RefineInput } from '../contracts.js';
import { generationJsonSchema, generationPrompt, refinementPrompt } from '../prompts.js';

type GeminiClient = {
  models: { generateContent(request: unknown): Promise<{ text?: string }> };
};

export class GeminiAnalysisProvider implements AnalysisProvider {
  readonly name = 'gemini' as const;

  constructor(private readonly client: GeminiClient) {}

  async generate(input: GenerateInput) {
    const contentParts: unknown[] = [{ text: generationPrompt(input) }];
    if (input.image) contentParts.push({ inlineData: input.image });
    const schema = generationJsonSchema(input);
    const response = await this.client.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: { parts: contentParts },
      config: { responseMimeType: 'application/json', responseSchema: toGeminiSchema(schema) },
    });
    return generationResultSchema.parse(JSON.parse(requiredText(response.text)));
  }

  async refine(input: RefineInput) {
    const response = await this.client.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: refinementPrompt(input),
    });
    return requiredText(response.text);
  }
}

function requiredText(value?: string) {
  if (!value?.trim()) throw new Error('invalid_provider_output');
  return value.trim();
}

function toGeminiSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toGeminiSchema);
  if (!value || typeof value !== 'object') return value;
  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    result[key] = key === 'type' && typeof nested === 'string'
      ? ({ object: Type.OBJECT, string: Type.STRING }[nested] ?? nested)
      : toGeminiSchema(nested);
  }
  return result;
}
