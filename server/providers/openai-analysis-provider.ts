import { generationResultSchema, type AnalysisProvider, type GenerateInput, type RefineInput } from '../contracts.js';
import { generationJsonSchema, generationPrompt, refinementPrompt } from '../prompts.js';

type OpenAIResponsesClient = {
  responses: { create(request: unknown): Promise<{ output_text?: string }> };
};

export class OpenAIAnalysisProvider implements AnalysisProvider {
  readonly name = 'openai' as const;

  constructor(private readonly client: OpenAIResponsesClient) {}

  async generate(input: GenerateInput) {
    const content: Array<Record<string, unknown>> = [{ type: 'input_text', text: generationPrompt(input) }];
    if (input.image) content.push({ type: 'input_image', image_url: `data:${input.image.mimeType};base64,${input.image.data}`, detail: 'low' });
    const response = await this.client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5-mini',
      input: [{ role: 'user', content }],
      text: { format: { type: 'json_schema', name: 'canvas_analysis', strict: true, schema: generationJsonSchema(input) } },
      store: false,
    });
    return generationResultSchema.parse(JSON.parse(requiredText(response.output_text)));
  }

  async refine(input: RefineInput) {
    const response = await this.client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5-mini',
      input: refinementPrompt(input),
      store: false,
    });
    return requiredText(response.output_text);
  }
}

function requiredText(value?: string) {
  if (!value?.trim()) throw new Error('invalid_provider_output');
  return value.trim();
}
