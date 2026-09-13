
export enum CanvasType {
  BUSINESS_MODEL_CANVAS = 'BUSINESS_MODEL_CANVAS',
  PORTERS_FIVE_FORCES = 'PORTERS_FIVE_FORCES',
  SWOT_ANALYSIS = 'SWOT_ANALYSIS',
  VALUE_PROPOSITION_CANVAS = 'VALUE_PROPOSITION_CANVAS',
}

export interface CanvasData {
  [key: string]: string;
}

export interface SVGBlockData {
  id: string;
  title: string;
  description: string;
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
  height: number; // percentage
  shape?: 'rect' | 'circle';
  label?: string; // For major sections like in Value Proposition Canvas
  titleFontSize?: string;
  contentFontSize?: string;
  backgroundColor?: string;
}

export interface SVGDecoration {
    type: 'arrow' | 'line' | 'text' | 'path' | 'circle';
    points?: string; // For lines/arrows, e.g., "x1,y1 x2,y2"
    d?: string; // For SVG path data
    from?: { x: number; y: number };
    to?: { x: number; y: number };
    text?: string;
    x?: number;
    y?: number;
    fontSize?: string;
    fontWeight?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: string;
    cx?: number;
    cy?: number;
    r?: number;
}


export interface CanvasTemplate {
  name: string;
  description?: string;
  viewBox: string; // e.g., "0 0 1200 800"
  blocks: SVGBlockData[];
  decorations?: SVGDecoration[];
}

export interface AnalysisFeedback {
  strengths: string;
  suggestions: string;
}

export interface GenerationResult {
  canvasData: CanvasData;
  analysisFeedback: AnalysisFeedback;
}