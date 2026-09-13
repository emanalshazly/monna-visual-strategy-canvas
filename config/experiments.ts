/**
 * A/B Test Experiment Configurations
 * Define your experiments and conversion goals here
 */

import type { ABExperiment, ConversionGoal } from '../types/abTesting';
import { AnalyticsEventType } from '../types/abTesting';

/**
 * Example A/B Tests for the Visual Strategy Canvas Generator
 */

/**
 * Experiment 1: Button Color Variation
 * Test different button colors to see which drives more canvas generation
 */
export const buttonColorExperiment: ABExperiment = {
  id: 'button-color-test',
  name: 'Generate Button Color Test',
  description: 'Test blue vs green button color for canvas generation',
  variants: [
    {
      id: 'control',
      name: 'Blue Button (Control)',
      weight: 50,
      config: {
        buttonColor: 'blue',
        buttonClass: 'bg-blue-600 hover:bg-blue-700',
      },
    },
    {
      id: 'variant-green',
      name: 'Green Button',
      weight: 50,
      config: {
        buttonColor: 'green',
        buttonClass: 'bg-green-600 hover:bg-green-700',
      },
    },
  ],
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
  enabled: true,
  targetMetrics: ['conversion_rate', 'canvas_generated_count'],
};

/**
 * Experiment 2: Voice Input UI Variation
 * Test different voice input modal layouts
 */
export const voiceInputUIExperiment: ABExperiment = {
  id: 'voice-input-ui-test',
  name: 'Voice Input Modal Layout Test',
  description: 'Test compact vs expanded voice input modal design',
  variants: [
    {
      id: 'control',
      name: 'Standard Layout (Control)',
      weight: 50,
      config: {
        layout: 'standard',
        showWaveform: true,
        size: 'medium',
      },
    },
    {
      id: 'variant-compact',
      name: 'Compact Layout',
      weight: 50,
      config: {
        layout: 'compact',
        showWaveform: false,
        size: 'small',
      },
    },
  ],
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
  enabled: true,
  targetMetrics: ['voice_recording_completed', 'conversion_rate'],
};

/**
 * Experiment 3: Canvas Type Selector UI
 * Test dropdown vs card-based canvas type selection
 */
export const canvasTypeUIExperiment: ABExperiment = {
  id: 'canvas-type-ui-test',
  name: 'Canvas Type Selector UI Test',
  description: 'Test dropdown vs card grid for canvas type selection',
  variants: [
    {
      id: 'control',
      name: 'Dropdown (Control)',
      weight: 50,
      config: {
        selectorType: 'dropdown',
        showDescriptions: false,
      },
    },
    {
      id: 'variant-cards',
      name: 'Card Grid',
      weight: 50,
      config: {
        selectorType: 'cards',
        showDescriptions: true,
      },
    },
  ],
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
  enabled: true,
  targetMetrics: ['canvas_generated_count', 'user_engagement'],
};

/**
 * Experiment 4: Export Button Placement
 * Test different placements for the export button
 */
export const exportButtonPlacementExperiment: ABExperiment = {
  id: 'export-button-placement-test',
  name: 'Export Button Placement Test',
  description: 'Test top vs bottom placement for export button',
  variants: [
    {
      id: 'control',
      name: 'Top Right (Control)',
      weight: 50,
      config: {
        placement: 'top-right',
        sticky: false,
      },
    },
    {
      id: 'variant-bottom-sticky',
      name: 'Bottom Sticky',
      weight: 50,
      config: {
        placement: 'bottom',
        sticky: true,
      },
    },
  ],
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
  enabled: true,
  targetMetrics: ['canvas_export_completed', 'export_rate'],
};

/**
 * Experiment 5: Analysis Panel Visibility
 * Test default visibility of the AI analysis panel
 */
export const analysisPanelExperiment: ABExperiment = {
  id: 'analysis-panel-visibility-test',
  name: 'Analysis Panel Default Visibility',
  description: 'Test showing analysis panel by default vs collapsed',
  variants: [
    {
      id: 'control',
      name: 'Collapsed by Default (Control)',
      weight: 50,
      config: {
        defaultExpanded: false,
        showToggle: true,
      },
    },
    {
      id: 'variant-expanded',
      name: 'Expanded by Default',
      weight: 50,
      config: {
        defaultExpanded: true,
        showToggle: true,
      },
    },
  ],
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
  enabled: true,
  targetMetrics: ['user_engagement', 'feature_used'],
};

/**
 * Conversion Goals
 */

export const firstCanvasCreatedGoal: ConversionGoal = {
  id: 'first-canvas-created',
  name: 'First Canvas Created',
  eventType: AnalyticsEventType.FIRST_CANVAS_CREATED,
  value: 100,
};

export const canvasExportedGoal: ConversionGoal = {
  id: 'canvas-exported',
  name: 'Canvas Exported',
  eventType: AnalyticsEventType.CANVAS_EXPORT_COMPLETED,
  value: 200,
};

export const voiceInputUsedGoal: ConversionGoal = {
  id: 'voice-input-used',
  name: 'Voice Input Used Successfully',
  eventType: AnalyticsEventType.VOICE_RECORDING_COMPLETED,
  value: 50,
};

/**
 * Export all experiments and conversion goals
 */
export const allExperiments: ABExperiment[] = [
  buttonColorExperiment,
  voiceInputUIExperiment,
  canvasTypeUIExperiment,
  exportButtonPlacementExperiment,
  analysisPanelExperiment,
];

export const allConversionGoals: ConversionGoal[] = [
  firstCanvasCreatedGoal,
  canvasExportedGoal,
  voiceInputUsedGoal,
];

/**
 * Helper function to get experiment by ID
 */
export function getExperimentById(id: string): ABExperiment | undefined {
  return allExperiments.find((exp) => exp.id === id);
}

/**
 * Helper function to enable/disable experiments
 */
export function toggleExperiment(id: string, enabled: boolean): void {
  const experiment = getExperimentById(id);
  if (experiment) {
    experiment.enabled = enabled;
  }
}
