/**
 * Example A/B Test Usage Component
 * Demonstrates how to integrate A/B tests into your components
 */

import React from 'react';
import {
  useABTest,
  useVariantConfig,
  useAnalytics,
  useButtonTracking,
} from '../hooks/useABTest';

/**
 * Example 1: Simple variant-based rendering
 */
export const GenerateButtonWithABTest: React.FC<{
  onClick: () => void;
  disabled?: boolean;
}> = ({ onClick, disabled = false }) => {
  const variant = useABTest('button-color-test');
  const trackClick = useButtonTracking('generate-canvas-button');

  // Get variant-specific configuration
  const config = useVariantConfig<{
    buttonColor: string;
    buttonClass: string;
  }>('button-color-test', {
    buttonColor: 'blue',
    buttonClass: 'bg-blue-600 hover:bg-blue-700',
  });

  const handleClick = () => {
    trackClick({ variant: variant?.id });
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`${config.buttonClass} text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      Generate Canvas
    </button>
  );
};

/**
 * Example 2: Conditional rendering based on variant
 */
export const VoiceInputModalWithABTest: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const variant = useABTest('voice-input-ui-test');
  const { trackEvent } = useAnalytics();

  const config = useVariantConfig<{
    layout: string;
    showWaveform: boolean;
    size: string;
  }>('voice-input-ui-test', {
    layout: 'standard',
    showWaveform: true,
    size: 'medium',
  });

  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-lg',
    large: 'max-w-2xl',
  };

  React.useEffect(() => {
    if (isOpen) {
      trackEvent('modal_opened' as any, {
        modal: 'voice-input',
        variant: variant?.id,
        layout: config.layout,
      });
    }
  }, [isOpen, trackEvent, variant?.id, config.layout]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg p-6 ${
          sizeClasses[config.size as keyof typeof sizeClasses]
        }`}
      >
        <h2 className="text-xl font-bold mb-4">Voice Input</h2>

        {config.layout === 'compact' ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Click to start recording
            </p>
            <button className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-md">
              Start Recording
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Describe your business strategy using your voice
            </p>
            {config.showWaveform && (
              <div className="h-24 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">Waveform Visualization</span>
              </div>
            )}
            <button className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-md">
              Start Recording
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        >
          Close
        </button>
      </div>
    </div>
  );
};

/**
 * Example 3: Canvas type selector with A/B test
 */
export const CanvasTypeSelectorWithABTest: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; description?: string }>;
}> = ({ value, onChange, options }) => {
  const variant = useABTest('canvas-type-ui-test');
  const { trackEvent } = useAnalytics();

  const config = useVariantConfig<{
    selectorType: string;
    showDescriptions: boolean;
  }>('canvas-type-ui-test', {
    selectorType: 'dropdown',
    showDescriptions: false,
  });

  const handleChange = (newValue: string) => {
    trackEvent('button_click' as any, {
      action: 'canvas-type-selected',
      canvasType: newValue,
      variant: variant?.id,
      selectorType: config.selectorType,
    });
    onChange(newValue);
  };

  if (config.selectorType === 'cards') {
    return (
      <div className="grid grid-cols-2 gap-4">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => handleChange(option.value)}
            className={`p-4 rounded-lg border-2 transition-all ${
              value === option.value
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
            }`}
          >
            <div className="font-semibold text-gray-900 dark:text-white">
              {option.label}
            </div>
            {config.showDescriptions && option.description && (
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {option.description}
              </div>
            )}
          </button>
        ))}
      </div>
    );
  }

  // Default dropdown
  return (
    <select
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

/**
 * Example 4: Export button with placement test
 */
export const ExportButtonWithABTest: React.FC<{
  onClick: () => void;
}> = ({ onClick }) => {
  const variant = useABTest('export-button-placement-test');
  const trackClick = useButtonTracking('export-button');

  const config = useVariantConfig<{
    placement: string;
    sticky: boolean;
  }>('export-button-placement-test', {
    placement: 'top-right',
    sticky: false,
  });

  const handleClick = () => {
    trackClick({ variant: variant?.id, placement: config.placement });
    onClick();
  };

  const positionClasses = {
    'top-right': 'top-4 right-4',
    bottom: 'bottom-4 left-1/2 -translate-x-1/2',
  };

  const stickyClass = config.sticky ? 'sticky' : 'absolute';

  return (
    <button
      onClick={handleClick}
      className={`${stickyClass} ${
        positionClasses[config.placement as keyof typeof positionClasses]
      } bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium shadow-lg transition-all hover:shadow-xl z-10`}
    >
      Export Canvas
    </button>
  );
};

/**
 * Example 5: Analysis panel with visibility test
 */
export const AnalysisPanelWithABTest: React.FC<{
  analysis: string;
}> = ({ analysis }) => {
  const variant = useABTest('analysis-panel-visibility-test');
  const { trackEvent } = useAnalytics();

  const config = useVariantConfig<{
    defaultExpanded: boolean;
    showToggle: boolean;
  }>('analysis-panel-visibility-test', {
    defaultExpanded: false,
    showToggle: true,
  });

  const [isExpanded, setIsExpanded] = React.useState(config.defaultExpanded);

  const handleToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    trackEvent('button_click' as any, {
      action: 'toggle-analysis-panel',
      expanded: newState,
      variant: variant?.id,
    });
  };

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
      {config.showToggle && (
        <button
          onClick={handleToggle}
          className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 text-left font-semibold text-gray-900 dark:text-white flex justify-between items-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <span>AI Strategic Analysis</span>
          <svg
            className={`w-5 h-5 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      )}

      {isExpanded && (
        <div className="p-4 bg-white dark:bg-gray-800">
          <p className="text-gray-700 dark:text-gray-300">{analysis}</p>
        </div>
      )}
    </div>
  );
};
