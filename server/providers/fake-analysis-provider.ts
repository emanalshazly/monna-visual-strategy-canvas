import { CANVAS_TEMPLATES } from '../../constants.js';
import type { AnalysisProvider, GenerateInput, GenerationResult, RefineInput } from '../contracts.js';

export class FakeAnalysisProvider implements AnalysisProvider {
  readonly name = 'fake' as const;

  async generate(input: GenerateInput): Promise<GenerationResult> {
    const canvasData = Object.fromEntries(CANVAS_TEMPLATES[input.canvasType].blocks.map((block) => [block.id, `Fixture content for ${block.title}`]));
    return {
      canvasData,
      analysisFeedback: {
        strengths: '• Deterministic fixture strength',
        suggestions: '• Validate this strategy with real evidence',
      },
    };
  }

  async refine(input: RefineInput) {
    return `Refined: ${input.currentContent}`;
  }
}
