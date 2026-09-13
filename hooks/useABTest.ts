/**
 * A/B Testing React Hooks
 * Custom hooks for integrating A/B tests into React components
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getABTestingService } from '../services/abTestingService';
import { getAnalyticsService } from '../services/analyticsService';
import type {
  ABVariant,
  ExperimentId,
  VariantId,
  AnalyticsEventType,
} from '../types/abTesting';

/**
 * Hook to get variant for an experiment
 * @param experimentId - The experiment ID
 * @returns The assigned variant or null
 */
export function useABTest(experimentId: ExperimentId): ABVariant | null {
  const [variant, setVariant] = useState<ABVariant | null>(null);

  useEffect(() => {
    const abService = getABTestingService();
    const assignedVariant = abService.getVariant(experimentId);
    setVariant(assignedVariant);
  }, [experimentId]);

  return variant;
}

/**
 * Hook to check if user is in a specific variant
 * @param experimentId - The experiment ID
 * @param variantId - The variant ID to check
 * @returns true if user is in the specified variant
 */
export function useVariant(experimentId: ExperimentId, variantId: VariantId): boolean {
  const variant = useABTest(experimentId);
  return variant?.id === variantId;
}

/**
 * Hook to get variant configuration
 * @param experimentId - The experiment ID
 * @param defaultConfig - Default configuration if not in experiment
 * @returns Variant-specific configuration
 */
export function useVariantConfig<T = Record<string, unknown>>(
  experimentId: ExperimentId,
  defaultConfig: T
): T {
  const variant = useABTest(experimentId);

  return useMemo(() => {
    if (!variant?.config) {
      return defaultConfig;
    }
    return { ...defaultConfig, ...variant.config } as T;
  }, [variant, defaultConfig]);
}

/**
 * Hook to track analytics events
 * @returns Function to track events
 */
export function useAnalytics() {
  const analyticsService = getAnalyticsService();

  const trackEvent = useCallback(
    (eventType: AnalyticsEventType, properties?: Record<string, unknown>) => {
      analyticsService.trackEvent(eventType, properties);
    },
    [analyticsService]
  );

  return { trackEvent };
}

/**
 * Hook to track page views
 * @param pageName - Name of the page
 */
export function usePageTracking(pageName: string): void {
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    trackEvent('page_view' as AnalyticsEventType, { page: pageName });
  }, [pageName, trackEvent]);
}

/**
 * Hook to track button clicks
 * @param buttonId - Identifier for the button
 * @returns Click handler function
 */
export function useButtonTracking(buttonId: string) {
  const { trackEvent } = useAnalytics();

  const handleClick = useCallback(
    (additionalProps?: Record<string, unknown>) => {
      trackEvent('button_click' as AnalyticsEventType, {
        buttonId,
        ...additionalProps,
      });
    },
    [buttonId, trackEvent]
  );

  return handleClick;
}

/**
 * Hook to track form submissions
 * @param formId - Identifier for the form
 * @returns Submit handler function
 */
export function useFormTracking(formId: string) {
  const { trackEvent } = useAnalytics();

  const handleSubmit = useCallback(
    (formData?: Record<string, unknown>) => {
      trackEvent('form_submit' as AnalyticsEventType, {
        formId,
        ...formData,
      });
    },
    [formId, trackEvent]
  );

  return handleSubmit;
}

/**
 * Hook to track feature usage
 * @param featureName - Name of the feature
 * @returns Function to track feature usage
 */
export function useFeatureTracking(featureName: string) {
  const { trackEvent } = useAnalytics();

  const trackFeatureUse = useCallback(
    (properties?: Record<string, unknown>) => {
      trackEvent('feature_used' as AnalyticsEventType, {
        feature: featureName,
        ...properties,
      });
    },
    [featureName, trackEvent]
  );

  return trackFeatureUse;
}

/**
 * Hook to track modal open/close
 * @param modalName - Name of the modal
 * @returns Functions to track modal state
 */
export function useModalTracking(modalName: string) {
  const { trackEvent } = useAnalytics();

  const trackOpen = useCallback(() => {
    trackEvent('modal_opened' as AnalyticsEventType, { modal: modalName });
  }, [modalName, trackEvent]);

  const trackClose = useCallback(() => {
    trackEvent('modal_closed' as AnalyticsEventType, { modal: modalName });
  }, [modalName, trackEvent]);

  return { trackOpen, trackClose };
}

/**
 * Hook to get all active experiments for current user
 * @returns Array of active experiment IDs and their variants
 */
export function useActiveExperiments(): Array<{
  experimentId: ExperimentId;
  variantId: VariantId;
}> {
  const [experiments, setExperiments] = useState<
    Array<{ experimentId: ExperimentId; variantId: VariantId }>
  >([]);

  useEffect(() => {
    const abService = getABTestingService();
    const assignments = abService.getUserAssignments();

    const active = assignments.map((a) => ({
      experimentId: a.experimentId,
      variantId: a.variantId,
    }));

    setExperiments(active);
  }, []);

  return experiments;
}

/**
 * Hook for A/B testing with automatic event tracking
 * @param experimentId - The experiment ID
 * @param eventType - Event type to track when variant is assigned
 * @returns The assigned variant
 */
export function useABTestWithTracking(
  experimentId: ExperimentId,
  eventType?: AnalyticsEventType
): ABVariant | null {
  const variant = useABTest(experimentId);
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    if (variant && eventType) {
      trackEvent(eventType, {
        experimentId,
        variantId: variant.id,
        variantName: variant.name,
      });
    }
  }, [variant, eventType, experimentId, trackEvent]);

  return variant;
}

/**
 * Hook to render different components based on variant
 * @param experimentId - The experiment ID
 * @param components - Map of variant IDs to components
 * @param defaultComponent - Component to render if not in experiment
 * @returns Component to render
 */
export function useVariantComponent<T = React.ReactNode>(
  experimentId: ExperimentId,
  components: Record<VariantId, T>,
  defaultComponent: T
): T {
  const variant = useABTest(experimentId);

  return useMemo(() => {
    if (!variant || !components[variant.id]) {
      return defaultComponent;
    }
    return components[variant.id];
  }, [variant, components, defaultComponent]);
}

/**
 * Hook to enable debug mode for A/B testing
 * Useful for development and testing
 */
export function useABTestDebug(): {
  enableDebug: () => void;
  disableDebug: () => void;
  clearData: () => void;
  getUserId: () => string;
} {
  const abService = getABTestingService();
  const analyticsService = getAnalyticsService();

  const enableDebug = useCallback(() => {
    abService.setDebugMode(true);
    console.log('[A/B Test Debug] Debug mode enabled');
  }, [abService]);

  const disableDebug = useCallback(() => {
    abService.setDebugMode(false);
    console.log('[A/B Test Debug] Debug mode disabled');
  }, [abService]);

  const clearData = useCallback(() => {
    abService.clearData();
    analyticsService.clearData();
    console.log('[A/B Test Debug] All data cleared');
  }, [abService, analyticsService]);

  const getUserId = useCallback(() => {
    return abService.getCurrentUserId();
  }, [abService]);

  return { enableDebug, disableDebug, clearData, getUserId };
}
