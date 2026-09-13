/**
 * A/B Testing Framework Types
 * Comprehensive type definitions for experimentation and analytics
 */

export type VariantId = string;
export type ExperimentId = string;
export type UserId = string;

/**
 * A/B Test Variant Definition
 */
export interface ABVariant {
  id: VariantId;
  name: string;
  weight: number; // 0-100, percentage of traffic
  config?: Record<string, unknown>; // Variant-specific configuration
}

/**
 * A/B Test Experiment Definition
 */
export interface ABExperiment {
  id: ExperimentId;
  name: string;
  description: string;
  variants: ABVariant[];
  startDate: Date;
  endDate?: Date;
  enabled: boolean;
  targetMetrics: string[]; // Metrics to track for this experiment
}

/**
 * User Assignment to Experiment
 */
export interface UserAssignment {
  userId: UserId;
  experimentId: ExperimentId;
  variantId: VariantId;
  assignedAt: Date;
}

/**
 * Analytics Event Types
 */
export enum AnalyticsEventType {
  // User interactions
  PAGE_VIEW = 'page_view',
  BUTTON_CLICK = 'button_click',
  FORM_SUBMIT = 'form_submit',

  // Canvas-specific events
  CANVAS_GENERATED = 'canvas_generated',
  CANVAS_EDITED = 'canvas_edited',
  CANVAS_EXPORTED = 'canvas_exported',

  // Voice interaction events
  VOICE_RECORDING_STARTED = 'voice_recording_started',
  VOICE_RECORDING_COMPLETED = 'voice_recording_completed',
  VOICE_RECORDING_FAILED = 'voice_recording_failed',

  // Conversion events
  FIRST_CANVAS_CREATED = 'first_canvas_created',
  CANVAS_EXPORT_COMPLETED = 'canvas_export_completed',

  // Feature usage
  FEATURE_USED = 'feature_used',
  MODAL_OPENED = 'modal_opened',
  MODAL_CLOSED = 'modal_closed',

  // Error events
  ERROR_OCCURRED = 'error_occurred',
}

/**
 * Analytics Event
 */
export interface AnalyticsEvent {
  eventType: AnalyticsEventType;
  timestamp: Date;
  userId: UserId;
  experimentId?: ExperimentId;
  variantId?: VariantId;
  properties?: Record<string, unknown>;
  metadata?: {
    userAgent?: string;
    screenSize?: string;
    sessionId?: string;
  };
}

/**
 * Conversion Goal Definition
 */
export interface ConversionGoal {
  id: string;
  name: string;
  eventType: AnalyticsEventType;
  conditions?: Record<string, unknown>; // Additional conditions for conversion
  value?: number; // Monetary or point value of conversion
}

/**
 * Experiment Metrics
 */
export interface ExperimentMetrics {
  experimentId: ExperimentId;
  variantId: VariantId;

  // Basic metrics
  totalUsers: number;
  totalEvents: number;

  // Conversion metrics
  conversions: number;
  conversionRate: number;

  // Engagement metrics
  avgSessionDuration: number;
  avgEventsPerUser: number;
  bounceRate: number;

  // Performance metrics
  avgLoadTime?: number;
  errorRate: number;

  // Custom metrics
  customMetrics?: Record<string, number>;
}

/**
 * A/B Test Results
 */
export interface ABTestResults {
  experimentId: ExperimentId;
  experimentName: string;
  startDate: Date;
  endDate?: Date;

  variantMetrics: Map<VariantId, ExperimentMetrics>;

  // Statistical significance
  isSignificant: boolean;
  confidenceLevel?: number; // 0-100
  pValue?: number;

  // Winner determination
  winningVariant?: VariantId;
  improvement?: number; // Percentage improvement over control

  recommendations?: string[];
}

/**
 * Local Storage Schema for A/B Testing
 */
export interface ABTestStorageData {
  userId: UserId;
  assignments: UserAssignment[];
  events: AnalyticsEvent[];
  sessionId: string;
  lastUpdated: Date;
}

/**
 * A/B Test Configuration
 */
export interface ABTestConfig {
  persistAssignments: boolean; // Store assignments in localStorage
  trackingEnabled: boolean;
  debugMode: boolean;
  sampleRate: number; // 0-100, percentage of users to include
}
