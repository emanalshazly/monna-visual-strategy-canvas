/**
 * A/B Test Context
 * Provides A/B testing and analytics capabilities throughout the app
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getABTestingService } from '../services/abTestingService';
import { getAnalyticsService } from '../services/analyticsService';
import type {
  ABExperiment,
  ABVariant,
  ConversionGoal,
  ABTestResults,
  ExperimentId,
  ABTestConfig,
  AnalyticsEventType,
} from '../types/abTesting';

interface ABTestContextValue {
  // Experiment management
  registerExperiment: (experiment: ABExperiment) => void;
  getVariant: (experimentId: ExperimentId) => ABVariant | null;
  getExperiments: () => ABExperiment[];

  // Analytics
  trackEvent: (eventType: AnalyticsEventType, properties?: Record<string, unknown>) => void;
  registerConversionGoal: (goal: ConversionGoal) => void;
  getResults: (experimentId: ExperimentId) => ABTestResults | null;

  // Utility
  userId: string;
  sessionId: string;
  isInitialized: boolean;
}

const ABTestContext = createContext<ABTestContextValue | undefined>(undefined);

interface ABTestProviderProps {
  children: ReactNode;
  config?: Partial<ABTestConfig>;
  experiments?: ABExperiment[];
  conversionGoals?: ConversionGoal[];
}

/**
 * A/B Test Provider Component
 */
export function ABTestProvider({
  children,
  config,
  experiments = [],
  conversionGoals = [],
}: ABTestProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [userId, setUserId] = useState('');
  const [sessionId, setSessionId] = useState('');

  // Initialize services
  useEffect(() => {
    const abService = getABTestingService(config);
    const analyticsService = getAnalyticsService();

    // Set user and session IDs
    setUserId(abService.getCurrentUserId());
    setSessionId(abService.getCurrentSessionId());

    // Register experiments
    experiments.forEach((experiment) => {
      try {
        abService.registerExperiment(experiment);
      } catch (error) {
        console.error('[A/B Test] Error registering experiment:', error);
      }
    });

    // Register conversion goals
    conversionGoals.forEach((goal) => {
      analyticsService.registerConversionGoal(goal);
    });

    setIsInitialized(true);

    // Track session start
    analyticsService.trackEvent('page_view' as AnalyticsEventType, {
      page: 'app_start',
      timestamp: new Date().toISOString(),
    });
  }, [config, experiments, conversionGoals]);

  const registerExperiment = (experiment: ABExperiment) => {
    const abService = getABTestingService();
    abService.registerExperiment(experiment);
  };

  const getVariant = (experimentId: ExperimentId): ABVariant | null => {
    const abService = getABTestingService();
    return abService.getVariant(experimentId);
  };

  const getExperiments = (): ABExperiment[] => {
    const abService = getABTestingService();
    return abService.getExperiments();
  };

  const trackEvent = (
    eventType: AnalyticsEventType,
    properties?: Record<string, unknown>
  ) => {
    const analyticsService = getAnalyticsService();
    analyticsService.trackEvent(eventType, properties);
  };

  const registerConversionGoal = (goal: ConversionGoal) => {
    const analyticsService = getAnalyticsService();
    analyticsService.registerConversionGoal(goal);
  };

  const getResults = (experimentId: ExperimentId): ABTestResults | null => {
    const analyticsService = getAnalyticsService();
    return analyticsService.getABTestResults(experimentId);
  };

  const value: ABTestContextValue = {
    registerExperiment,
    getVariant,
    getExperiments,
    trackEvent,
    registerConversionGoal,
    getResults,
    userId,
    sessionId,
    isInitialized,
  };

  return <ABTestContext.Provider value={value}>{children}</ABTestContext.Provider>;
}

/**
 * Hook to use A/B Test context
 */
export function useABTestContext(): ABTestContextValue {
  const context = useContext(ABTestContext);
  if (!context) {
    throw new Error('useABTestContext must be used within ABTestProvider');
  }
  return context;
}

export default ABTestContext;
