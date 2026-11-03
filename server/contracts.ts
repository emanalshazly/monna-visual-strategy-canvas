import { z } from 'zod';

export const canvasTypeSchema = z.enum([
  'BUSINESS_MODEL_CANVAS',
  'PORTERS_FIVE_FORCES',
  'SWOT_ANALYSIS',
  'VALUE_PROPOSITION_CANVAS',
]);

// Standard padded base64. A single-character-class pattern plus a length check stays linear and
// does not overflow the regex stack on the 8,000,000-character maximum, unlike a repeated group.
const BASE64_CHARACTERS = /^[A-Za-z0-9+/]+={0,2}$/;
const isBase64 = (value: string) => value.length % 4 === 0 && BASE64_CHARACTERS.test(value);

const imageSchema = z.object({
  data: z.string().min(1).max(8_000_000).refine(isBase64, 'image data must be base64'),
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

const nonBlank = (value: string) => value.trim().length > 0;

export const generationResultSchema = z.object({
  canvasData: z.record(z.string(), z.string().max(10_000).refine(nonBlank, 'block content must not be blank')),
  analysisFeedback: z.object({
    strengths: z.string().max(20_000).refine(nonBlank, 'strengths must not be blank'),
    suggestions: z.string().max(20_000).refine(nonBlank, 'suggestions must not be blank'),
  }).strict(),
}).strict();
export type GenerationResult = z.infer<typeof generationResultSchema>;

export interface AnalysisProvider {
  readonly name: 'gemini' | 'openai' | 'fake';
  generate(input: GenerateInput): Promise<GenerationResult>;
  refine(input: RefineInput): Promise<string>;
}
