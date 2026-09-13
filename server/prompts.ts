import { CANVAS_TEMPLATES } from '../constants.js';
import type { GenerateInput, RefineInput } from './contracts.js';

export function generationPrompt(input: GenerateInput) {
  const template = CANVAS_TEMPLATES[input.canvasType];
  const sections = template.blocks.map((block) => `- ${block.id} (${block.title}): ${block.description}`).join('\n');
  return `Populate a ${template.name} for the business context below. Use concise, specific bullet points. Do not invent market evidence, customer validation, financial results, or citations. Return only JSON with canvasData and analysisFeedback. canvasData must contain exactly these keys:\n${sections}\n\nBusiness context:\n${input.userInput}\n${input.fileContent ? `\nAdditional document context:\n${input.fileContent}` : ''}\n\nanalysisFeedback must contain strengths and suggestions. Treat strengths as internally coherent aspects, not validated market facts.`;
}

export function refinementPrompt(input: RefineInput) {
  return `Refine one strategy-canvas section. Preserve the user's meaning, make it concise and actionable, and do not invent evidence. Return only the revised section text.\n\nBusiness context: ${input.originalUserInput}\nSection: ${input.blockTitle}\nCurrent content: ${input.currentContent}`;
}

export function generationJsonSchema(input: GenerateInput) {
  const properties = Object.fromEntries(CANVAS_TEMPLATES[input.canvasType].blocks.map((block) => [block.id, { type: 'string' }]));
  return {
    type: 'object',
    additionalProperties: false,
    required: ['canvasData', 'analysisFeedback'],
    properties: {
      canvasData: { type: 'object', additionalProperties: false, required: Object.keys(properties), properties },
      analysisFeedback: {
        type: 'object',
        additionalProperties: false,
        required: ['strengths', 'suggestions'],
        properties: { strengths: { type: 'string' }, suggestions: { type: 'string' } },
      },
    },
  };
}
