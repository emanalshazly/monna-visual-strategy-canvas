import type { CanvasType, GenerationResult } from '../types';
import { CANVAS_TEMPLATES } from '../constants';

type Receipt = { requestId: string; provider: string; cached: boolean; durationMs: number };
type ServerBody =
  | { kind: 'generate'; result: GenerationResult; receipt: Receipt }
  | { kind: 'refine'; text: string; receipt: Receipt };

export async function analyzeAndGenerateCanvas(
  canvasType: CanvasType,
  userInput: string,
  fileContent: string,
  image?: { data: string; mimeType: string },
  signal?: AbortSignal,
): Promise<GenerationResult & { receipt: Receipt }> {
  if (import.meta.env.VITE_GITHUB_PAGES_DEMO === 'true') {
    const idea = userInput.trim().slice(0, 100) || 'the sample business';
    const canvasData = Object.fromEntries(
      CANVAS_TEMPLATES[canvasType].blocks.map((block) => [
        block.id,
        'Demo hypothesis for ' + block.title.toLowerCase() + ' based on “' + idea + '”. Validate this with customer evidence.',
      ]),
    );
    return {
      canvasData,
      analysisFeedback: {
        strengths: 'The idea has been translated into a complete, editable canvas structure.',
        suggestions: 'Treat every block as a hypothesis until supported by interviews, operational data, or experiments.',
      },
      receipt: { requestId: 'github-pages-demo', provider: 'deterministic-demo', cached: false, durationMs: 0 },
    };
  }

  const body = await postAnalysis({ action: 'generate', canvasType, userInput, fileContent, image }, signal);
  if (body.kind !== 'generate' || !body.result) throw new Error('The server returned an invalid analysis response.');
  return { ...body.result, receipt: body.receipt };
}

export async function refineBlockContent(
  blockTitle: string,
  currentContent: string,
  originalUserInput: string,
  signal?: AbortSignal,
) {
  if (import.meta.env.VITE_GITHUB_PAGES_DEMO === 'true') {
    return 'Demo refinement for ' + blockTitle + ': ' + currentContent.trim() + ' Validate this statement against evidence from the original idea: ' + originalUserInput.trim().slice(0, 100) + '.';
  }

  const body = await postAnalysis({ action: 'refine', blockTitle, currentContent, originalUserInput }, signal);
  if (body.kind !== 'refine' || typeof body.text !== 'string') throw new Error('The server returned an invalid refinement response.');
  return body.text;
}

async function postAnalysis(payload: Record<string, unknown>, signal?: AbortSignal): Promise<ServerBody> {
  const response = await fetch('/api/analysis', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof body.message === 'string' ? body.message : 'Strategy analysis failed. Please try again.';
    throw new Error(message);
  }
  return body as ServerBody;
}
