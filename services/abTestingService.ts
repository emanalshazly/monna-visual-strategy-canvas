/**
 * A/B Testing Service
 * Handles experiment management, variant assignment, and user tracking
 */

import type {
  ABExperiment,
  ABVariant,
  UserAssignment,
  UserId,
  ExperimentId,
  ABTestStorageData,
  ABTestConfig,
} from '../types/abTesting';

const STORAGE_KEY = 'abtest_data';
const SESSION_KEY = 'abtest_session';

/**
 * A/B Testing Service Class
 */
class ABTestingService {
  private config: ABTestConfig;
  private experiments: Map<ExperimentId, ABExperiment>;
  private userId: UserId;
  private sessionId: string;

  constructor(config: Partial<ABTestConfig> = {}) {
    this.config = {
      persistAssignments: true,
      trackingEnabled: true,
      debugMode: false,
      sampleRate: 100,
      ...config,
    };

    this.experiments = new Map();
    this.userId = this.getUserId();
    this.sessionId = this.getSessionId();

    if (this.config.debugMode) {
      console.log('[A/B Testing] Initialized', {
        userId: this.userId,
        sessionId: this.sessionId,
      });
    }
  }

  /**
   * Register an experiment
   */
  registerExperiment(experiment: ABExperiment): void {
    // Validate experiment
    if (!experiment.id || !experiment.variants || experiment.variants.length === 0) {
      throw new Error('Invalid experiment configuration');
    }

    // Validate variant weights sum to 100
    const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new Error(`Variant weights must sum to 100. Current sum: ${totalWeight}`);
    }

    this.experiments.set(experiment.id, experiment);

    if (this.config.debugMode) {
      console.log('[A/B Testing] Registered experiment:', experiment.name);
    }
  }

  /**
   * Get variant for a user in an experiment
   */
  getVariant(experimentId: ExperimentId): ABVariant | null {
    const experiment = this.experiments.get(experimentId);

    if (!experiment) {
      console.warn(`[A/B Testing] Experiment not found: ${experimentId}`);
      return null;
    }

    if (!experiment.enabled) {
      if (this.config.debugMode) {
        console.log(`[A/B Testing] Experiment disabled: ${experimentId}`);
      }
      return null;
    }

    // Check if experiment is within date range
    const now = new Date();
    if (now < experiment.startDate || (experiment.endDate && now > experiment.endDate)) {
      if (this.config.debugMode) {
        console.log(`[A/B Testing] Experiment outside date range: ${experimentId}`);
      }
      return null;
    }

    // Check if user is in sample
    if (!this.isUserInSample()) {
      return null;
    }

    // Check for existing assignment
    const existingAssignment = this.getAssignment(experimentId);
    if (existingAssignment) {
      const variant = experiment.variants.find((v) => v.id === existingAssignment.variantId);
      if (variant) {
        return variant;
      }
    }

    // Assign new variant
    const variant = this.assignVariant(experiment);
    this.saveAssignment({
      userId: this.userId,
      experimentId,
      variantId: variant.id,
      assignedAt: new Date(),
    });

    if (this.config.debugMode) {
      console.log('[A/B Testing] Assigned variant:', {
        experiment: experiment.name,
        variant: variant.name,
      });
    }

    return variant;
  }

  /**
   * Assign a variant based on weights
   */
  private assignVariant(experiment: ABExperiment): ABVariant {
    const random = this.getHashedRandom(experiment.id);
    let cumulative = 0;

    for (const variant of experiment.variants) {
      cumulative += variant.weight;
      if (random < cumulative) {
        return variant;
      }
    }

    // Fallback to first variant
    return experiment.variants[0];
  }

  /**
   * Get a deterministic random number for consistent assignment
   */
  private getHashedRandom(experimentId: ExperimentId): number {
    const str = `${this.userId}_${experimentId}`;
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Convert to 0-100 range
    return Math.abs(hash % 100);
  }

  /**
   * Check if user should be included in sample
   */
  private isUserInSample(): boolean {
    const random = this.getHashedRandom('sample');
    return random < this.config.sampleRate;
  }

  /**
   * Get existing assignment for experiment
   */
  private getAssignment(experimentId: ExperimentId): UserAssignment | null {
    if (!this.config.persistAssignments) {
      return null;
    }

    const data = this.loadStorageData();
    const assignment = data.assignments.find(
      (a) => a.experimentId === experimentId && a.userId === this.userId
    );

    return assignment || null;
  }

  /**
   * Save assignment to storage
   */
  private saveAssignment(assignment: UserAssignment): void {
    if (!this.config.persistAssignments) {
      return;
    }

    const data = this.loadStorageData();

    // Remove existing assignment for this experiment
    data.assignments = data.assignments.filter(
      (a) => !(a.experimentId === assignment.experimentId && a.userId === this.userId)
    );

    // Add new assignment
    data.assignments.push(assignment);
    data.lastUpdated = new Date();

    this.saveStorageData(data);
  }

  /**
   * Get all assignments for current user
   */
  getUserAssignments(): UserAssignment[] {
    const data = this.loadStorageData();
    return data.assignments.filter((a) => a.userId === this.userId);
  }

  /**
   * Get user ID (generate if needed)
   */
  private getUserId(): UserId {
    const stored = localStorage.getItem('abtest_user_id');
    if (stored) {
      return stored;
    }

    const newId = this.generateId();
    localStorage.setItem('abtest_user_id', newId);
    return newId;
  }

  /**
   * Get session ID (generate if needed)
   */
  private getSessionId(): string {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      return stored;
    }

    const newId = this.generateId();
    sessionStorage.setItem(SESSION_KEY, newId);
    return newId;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Load data from storage
   */
  private loadStorageData(): ABTestStorageData {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        // Convert date strings back to Date objects
        data.assignments = data.assignments.map((a: UserAssignment) => ({
          ...a,
          assignedAt: new Date(a.assignedAt),
        }));
        data.lastUpdated = new Date(data.lastUpdated);
        return data;
      }
    } catch (error) {
      console.error('[A/B Testing] Error loading storage:', error);
    }

    return {
      userId: this.userId,
      assignments: [],
      events: [],
      sessionId: this.sessionId,
      lastUpdated: new Date(),
    };
  }

  /**
   * Save data to storage
   */
  private saveStorageData(data: ABTestStorageData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[A/B Testing] Error saving storage:', error);
    }
  }

  /**
   * Clear all A/B test data (useful for testing)
   */
  clearData(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('abtest_user_id');
    sessionStorage.removeItem(SESSION_KEY);

    if (this.config.debugMode) {
      console.log('[A/B Testing] Data cleared');
    }
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): UserId {
    return this.userId;
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get all registered experiments
   */
  getExperiments(): ABExperiment[] {
    return Array.from(this.experiments.values());
  }

  /**
   * Get experiment by ID
   */
  getExperiment(experimentId: ExperimentId): ABExperiment | undefined {
    return this.experiments.get(experimentId);
  }

  /**
   * Enable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.config.debugMode = enabled;
  }
}

// Singleton instance
let instance: ABTestingService | null = null;

/**
 * Get A/B Testing service instance
 */
export function getABTestingService(config?: Partial<ABTestConfig>): ABTestingService {
  if (!instance) {
    instance = new ABTestingService(config);
  }
  return instance;
}

/**
 * Reset A/B Testing service (useful for testing)
 */
export function resetABTestingService(): void {
  instance = null;
}

export default ABTestingService;
