/**
 * Analytics Service
 * Handles event tracking, conversion metrics, and A/B test analysis
 */

import {
  AnalyticsEventType,
  type AnalyticsEvent,
  type ConversionGoal,
  type ExperimentMetrics,
  type ABTestResults,
  type ExperimentId,
  type VariantId,
} from '../types/abTesting';
import { getABTestingService } from './abTestingService';

const EVENTS_STORAGE_KEY = 'abtest_events';
const MAX_STORED_EVENTS = 1000;

/**
 * Analytics Service Class
 */
class AnalyticsService {
  private conversionGoals: Map<string, ConversionGoal>;
  private sessionStartTime: Date;

  constructor() {
    this.conversionGoals = new Map();
    this.sessionStartTime = new Date();
  }

  /**
   * Track an analytics event
   */
  trackEvent(
    eventType: AnalyticsEventType,
    properties?: Record<string, unknown>
  ): void {
    const abService = getABTestingService();
    const userId = abService.getCurrentUserId();
    const sessionId = abService.getCurrentSessionId();
    const assignments = abService.getUserAssignments();

    const event: AnalyticsEvent = {
      eventType,
      timestamp: new Date(),
      userId,
      properties,
      metadata: {
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        sessionId,
      },
    };

    // Add experiment context if user is in any experiments
    if (assignments.length > 0) {
      const assignment = assignments[0]; // For simplicity, use first assignment
      event.experimentId = assignment.experimentId;
      event.variantId = assignment.variantId;
    }

    // Store event
    this.saveEvent(event);

    // Check for conversions
    this.checkConversions(event);

    // Debug logging
    if (import.meta.env.DEV) {
      console.log('[Analytics] Event tracked:', {
        type: eventType,
        properties,
        experiment: event.experimentId,
        variant: event.variantId,
      });
    }

    // Send to external analytics (if configured)
    this.sendToExternalAnalytics(event);
  }

  /**
   * Register a conversion goal
   */
  registerConversionGoal(goal: ConversionGoal): void {
    this.conversionGoals.set(goal.id, goal);
  }

  /**
   * Check if event matches conversion goals
   */
  private checkConversions(event: AnalyticsEvent): void {
    for (const goal of this.conversionGoals.values()) {
      if (goal.eventType === event.eventType) {
        // Check additional conditions if specified
        if (goal.conditions) {
          const matches = this.matchesConditions(event.properties || {}, goal.conditions);
          if (!matches) continue;
        }

        // Track conversion
        this.trackConversion(goal, event);
      }
    }
  }

  /**
   * Check if event properties match goal conditions
   */
  private matchesConditions(
    properties: Record<string, unknown>,
    conditions: Record<string, unknown>
  ): boolean {
    for (const [key, value] of Object.entries(conditions)) {
      if (properties[key] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Track a conversion
   */
  private trackConversion(goal: ConversionGoal, event: AnalyticsEvent): void {
    this.trackEvent(AnalyticsEventType.FORM_SUBMIT, {
      conversionGoal: goal.id,
      conversionValue: goal.value,
      originalEvent: event.eventType,
    });

    if (import.meta.env.DEV) {
      console.log('[Analytics] Conversion tracked:', goal.name);
    }
  }

  /**
   * Get metrics for a specific experiment variant
   */
  getVariantMetrics(experimentId: ExperimentId, variantId: VariantId): ExperimentMetrics {
    const events = this.getStoredEvents();
    const variantEvents = events.filter(
      (e) => e.experimentId === experimentId && e.variantId === variantId
    );

    // Get unique users
    const uniqueUsers = new Set(variantEvents.map((e) => e.userId));
    const totalUsers = uniqueUsers.size;

    // Calculate conversions
    const conversions = variantEvents.filter((e) =>
      e.properties?.conversionGoal
    ).length;
    const conversionRate = totalUsers > 0 ? (conversions / totalUsers) * 100 : 0;

    // Calculate engagement metrics
    const avgEventsPerUser = totalUsers > 0 ? variantEvents.length / totalUsers : 0;

    // Calculate error rate
    const errorEvents = variantEvents.filter(
      (e) => e.eventType === AnalyticsEventType.ERROR_OCCURRED
    ).length;
    const errorRate = variantEvents.length > 0 ? (errorEvents / variantEvents.length) * 100 : 0;

    // Calculate session duration (simplified)
    const avgSessionDuration = this.calculateAvgSessionDuration(variantEvents);

    // Calculate bounce rate (users with only 1 event)
    let singleEventUsers = 0;
    uniqueUsers.forEach((userId) => {
      const userEvents = variantEvents.filter((e) => e.userId === userId);
      if (userEvents.length === 1) {
        singleEventUsers++;
      }
    });
    const bounceRate = totalUsers > 0 ? (singleEventUsers / totalUsers) * 100 : 0;

    return {
      experimentId,
      variantId,
      totalUsers,
      totalEvents: variantEvents.length,
      conversions,
      conversionRate,
      avgSessionDuration,
      avgEventsPerUser,
      bounceRate,
      errorRate,
      customMetrics: this.calculateCustomMetrics(variantEvents),
    };
  }

  /**
   * Calculate average session duration
   */
  private calculateAvgSessionDuration(events: AnalyticsEvent[]): number {
    const sessions = new Map<string, AnalyticsEvent[]>();

    // Group events by session
    events.forEach((event) => {
      const sessionId = event.metadata?.sessionId || 'unknown';
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, []);
      }
      sessions.get(sessionId)!.push(event);
    });

    // Calculate duration for each session
    let totalDuration = 0;
    sessions.forEach((sessionEvents) => {
      if (sessionEvents.length < 2) return;

      const sortedEvents = sessionEvents.sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      );
      const duration =
        sortedEvents[sortedEvents.length - 1].timestamp.getTime() -
        sortedEvents[0].timestamp.getTime();
      totalDuration += duration;
    });

    return sessions.size > 0 ? totalDuration / sessions.size / 1000 : 0; // Convert to seconds
  }

  /**
   * Calculate custom metrics specific to the canvas generator
   */
  private calculateCustomMetrics(events: AnalyticsEvent[]): Record<string, number> {
    const canvasGenerated = events.filter(
      (e) => e.eventType === AnalyticsEventType.CANVAS_GENERATED
    ).length;
    const canvasExported = events.filter(
      (e) => e.eventType === AnalyticsEventType.CANVAS_EXPORTED
    ).length;
    const voiceUsed = events.filter(
      (e) => e.eventType === AnalyticsEventType.VOICE_RECORDING_COMPLETED
    ).length;

    return {
      canvasGeneratedCount: canvasGenerated,
      canvasExportedCount: canvasExported,
      voiceUsageCount: voiceUsed,
      exportRate: canvasGenerated > 0 ? (canvasExported / canvasGenerated) * 100 : 0,
    };
  }

  /**
   * Get A/B test results for an experiment
   */
  getABTestResults(experimentId: ExperimentId): ABTestResults | null {
    const abService = getABTestingService();
    const experiment = abService.getExperiment(experimentId);

    if (!experiment) {
      console.warn(`[Analytics] Experiment not found: ${experimentId}`);
      return null;
    }

    // Calculate metrics for each variant
    const variantMetrics = new Map<VariantId, ExperimentMetrics>();

    experiment.variants.forEach((variant) => {
      const metrics = this.getVariantMetrics(experimentId, variant.id);
      variantMetrics.set(variant.id, metrics);

    });
    const controlMetrics = experiment.variants.length > 0
      ? variantMetrics.get(experiment.variants[0].id) ?? null
      : null;

    // Determine winner and statistical significance
    let winningVariant: VariantId | undefined;
    let maxConversionRate = 0;
    let improvement = 0;

    variantMetrics.forEach((metrics, variantId) => {
      if (metrics.conversionRate > maxConversionRate) {
        maxConversionRate = metrics.conversionRate;
        winningVariant = variantId;
      }
    });

    // Calculate improvement over control
    if (controlMetrics && winningVariant) {
      const winnerMetrics = variantMetrics.get(winningVariant)!;
      improvement = controlMetrics.conversionRate > 0
        ? ((winnerMetrics.conversionRate - controlMetrics.conversionRate) /
            controlMetrics.conversionRate) *
          100
        : 0;
    }

    // Simplified statistical significance (would use proper test in production)
    const isSignificant = this.calculateStatisticalSignificance(variantMetrics);
    const { pValue, confidenceLevel } = this.calculatePValue(variantMetrics);

    return {
      experimentId,
      experimentName: experiment.name,
      startDate: experiment.startDate,
      endDate: experiment.endDate,
      variantMetrics,
      isSignificant,
      pValue,
      confidenceLevel,
      winningVariant,
      improvement,
      recommendations: this.generateRecommendations(variantMetrics, isSignificant),
    };
  }

  /**
   * Calculate statistical significance (simplified)
   */
  private calculateStatisticalSignificance(
    variantMetrics: Map<VariantId, ExperimentMetrics>
  ): boolean {
    // Simplified check: require minimum sample size and meaningful difference
    const metrics = Array.from(variantMetrics.values());
    if (metrics.length < 2) return false;

    const minSampleSize = 30; // Minimum users per variant
    const minDifference = 5; // Minimum 5% difference

    const allHaveEnoughSamples = metrics.every((m) => m.totalUsers >= minSampleSize);
    if (!allHaveEnoughSamples) return false;

    const rates = metrics.map((m) => m.conversionRate);
    const maxRate = Math.max(...rates);
    const minRate = Math.min(...rates);

    return maxRate - minRate >= minDifference;
  }

  /**
   * Calculate p-value and confidence level (simplified)
   */
  private calculatePValue(
    variantMetrics: Map<VariantId, ExperimentMetrics>
  ): { pValue: number; confidenceLevel: number } {
    // This is a simplified calculation
    // In production, use proper statistical test (e.g., chi-square, t-test)
    const metrics = Array.from(variantMetrics.values());
    if (metrics.length < 2) {
      return { pValue: 1.0, confidenceLevel: 0 };
    }

    const rates = metrics.map((m) => m.conversionRate);
    const samples = metrics.map((m) => m.totalUsers);

    // Calculate variance
    const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
    const variance =
      rates.reduce((sum, rate) => sum + Math.pow(rate - avgRate, 2), 0) / rates.length;

    // Simplified p-value based on variance and sample size
    const avgSampleSize = samples.reduce((a, b) => a + b, 0) / samples.length;
    const effectSize = variance / avgRate;

    let pValue = Math.max(0.01, Math.min(0.5, 1 - avgSampleSize / 1000 * effectSize));
    let confidenceLevel = (1 - pValue) * 100;

    return { pValue, confidenceLevel };
  }

  /**
   * Generate recommendations based on results
   */
  private generateRecommendations(
    variantMetrics: Map<VariantId, ExperimentMetrics>,
    isSignificant: boolean
  ): string[] {
    const recommendations: string[] = [];
    const metrics = Array.from(variantMetrics.values());

    if (!isSignificant) {
      recommendations.push(
        'Results are not statistically significant yet. Continue running the experiment.'
      );
      const minUsers = metrics.map((m) => m.totalUsers);
      if (Math.min(...minUsers) < 30) {
        recommendations.push(
          'Insufficient sample size. Aim for at least 30 users per variant.'
        );
      }
    } else {
      recommendations.push('Results are statistically significant. Consider implementing the winning variant.');
    }

    // Check error rates
    const highErrorRate = metrics.some((m) => m.errorRate > 10);
    if (highErrorRate) {
      recommendations.push('High error rate detected in one or more variants. Investigate technical issues.');
    }

    // Check bounce rates
    const highBounceRate = metrics.some((m) => m.bounceRate > 70);
    if (highBounceRate) {
      recommendations.push('High bounce rate detected. Consider improving user engagement.');
    }

    return recommendations;
  }

  /**
   * Save event to storage
   */
  private saveEvent(event: AnalyticsEvent): void {
    try {
      const events = this.getStoredEvents();
      events.push(event);

      // Keep only recent events
      const recentEvents = events.slice(-MAX_STORED_EVENTS);

      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(recentEvents));
    } catch (error) {
      console.error('[Analytics] Error saving event:', error);
    }
  }

  /**
   * Get stored events
   */
  private getStoredEvents(): AnalyticsEvent[] {
    try {
      const stored = localStorage.getItem(EVENTS_STORAGE_KEY);
      if (stored) {
        const events = JSON.parse(stored);
        return events.map((e: AnalyticsEvent) => ({
          ...e,
          timestamp: new Date(e.timestamp),
        }));
      }
    } catch (error) {
      console.error('[Analytics] Error loading events:', error);
    }
    return [];
  }

  /**
   * Send to external analytics platforms (Google Analytics, Mixpanel, etc.)
   */
  private sendToExternalAnalytics(event: AnalyticsEvent): void {
    // Google Analytics 4 (if available)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', event.eventType, {
        event_category: 'A/B Test',
        event_label: event.experimentId,
        value: event.variantId,
        ...event.properties,
      });
    }

    // Custom analytics endpoint (if configured)
    if (import.meta.env.VITE_ANALYTICS_ENDPOINT) {
      fetch(import.meta.env.VITE_ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }).catch((error) => {
        console.error('[Analytics] Error sending to external analytics:', error);
      });
    }
  }

  /**
   * Export events as CSV
   */
  exportEventsAsCSV(): string {
    const events = this.getStoredEvents();
    if (events.length === 0) return '';

    const headers = [
      'timestamp',
      'eventType',
      'userId',
      'experimentId',
      'variantId',
      'sessionId',
      'properties',
    ];

    const rows = events.map((e) => [
      e.timestamp.toISOString(),
      e.eventType,
      e.userId,
      e.experimentId || '',
      e.variantId || '',
      e.metadata?.sessionId || '',
      JSON.stringify(e.properties || {}),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    return csv;
  }

  /**
   * Clear all analytics data
   */
  clearData(): void {
    localStorage.removeItem(EVENTS_STORAGE_KEY);
  }

  /**
   * Get session duration
   */
  getSessionDuration(): number {
    return (Date.now() - this.sessionStartTime.getTime()) / 1000; // seconds
  }
}

// Singleton instance
let instance: AnalyticsService | null = null;

/**
 * Get Analytics service instance
 */
export function getAnalyticsService(): AnalyticsService {
  if (!instance) {
    instance = new AnalyticsService();
  }
  return instance;
}

/**
 * Reset Analytics service (useful for testing)
 */
export function resetAnalyticsService(): void {
  instance = null;
}

export default AnalyticsService;
