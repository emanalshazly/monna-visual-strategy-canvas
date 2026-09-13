import { z } from 'zod';

export const canvasTypeSchema = z.enum([
  'BUSINESS_MODEL_CANVAS',
  'PORTERS_FIVE_FORCES',
  'SWOT_ANALYSIS',
  'VALUE_PROPOSITION_CANVAS',
]);

const imageSchema = z.object({
  data: z.string().min(1).max(8_000_000),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
}).strict();

export const generateInputSchema = z.object({
  action: z.literal('generate'),
  canvasType: canvasTypeSchema,
  userInput: z.string().trim().min(1).max(10_000),
  fileContent: z.string().max(100_000).default(''),
  image: imageSchema.optional(),
}).strict();

export const refineInputSchema = z.object({
  action: z.literal('refine'),
  blockTitle: z.string().trim().min(1).max(200),
  currentContent: z.string().max(10_000),
  originalUserInput: z.string().max(10_000),
}).strict();

export const analysisRequestSchema = z.discriminatedUnion('action', [generateInputSchema, refineInputSchema]);
export type AnalysisRequest = z.infer<typeof analysisRequestSchema>;
export type GenerateInput = z.infer<typeof generateInputSchema>;
export type RefineInput = z.infer<typeof refineInputSchema>;

export const generationResultSchema = z.object({
  canvasData: z.record(z.string(), z.string().max(10_000)),
  analysisFeedback: z.object({
    strengths: z.string().max(20_000),
    suggestions: z.string().max(20_000),
  }).strict(),
}).strict();
export type GenerationResult = z.infer<typeof generationResultSchema>;

export interface AnalysisProvider {
  readonly name: 'gemini' | 'openai' | 'fake';
  generate(input: GenerateInput): Promise<GenerationResult>;
  refine(input: RefineInput): Promise<string>;
}
