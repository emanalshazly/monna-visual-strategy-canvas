/**
 * A/B Test Dashboard Component
 * Displays experiment results, metrics, and analytics
 */

import React, { useState, useEffect } from 'react';
import { useABTestContext } from '../contexts/ABTestContext';
import { getAnalyticsService } from '../services/analyticsService';
import type { ABTestResults, ABExperiment, ExperimentMetrics } from '../types/abTesting';

const ABTestDashboard: React.FC = () => {
  const { getExperiments, getResults, userId, sessionId } = useABTestContext();
  const [experiments, setExperiments] = useState<ABExperiment[]>([]);
  const [selectedExperiment, setSelectedExperiment] = useState<string | null>(null);
  const [results, setResults] = useState<ABTestResults | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  useEffect(() => {
    const allExperiments = getExperiments();
    setExperiments(allExperiments);
    if (allExperiments.length > 0 && !selectedExperiment) {
      setSelectedExperiment(allExperiments[0].id);
    }
  }, [getExperiments, selectedExperiment]);

  useEffect(() => {
    if (selectedExperiment) {
      const experimentResults = getResults(selectedExperiment);
      setResults(experimentResults);
    }
  }, [selectedExperiment, getResults]);

  const handleExportData = () => {
    const analyticsService = getAnalyticsService();
    const csv = analyticsService.exportEventsAsCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `abtest-data-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

  const formatNumber = (value: number): string => {
    return value.toLocaleString();
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds.toFixed(0)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  const getMetricColor = (metric: number, threshold: number, inverse = false): string => {
    const isGood = inverse ? metric < threshold : metric > threshold;
    return isGood ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  };

  const renderMetricCard = (
    label: string,
    value: string | number,
    className = '',
    subtitle?: string
  ) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${className}`}>{value}</div>
      {subtitle && (
        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">{subtitle}</div>
      )}
    </div>
  );

  const renderVariantMetrics = (variantId: string, metrics: ExperimentMetrics) => {
    const experiment = experiments.find((e) => e.id === selectedExperiment);
    const variant = experiment?.variants.find((v) => v.id === variantId);

    return (
      <div key={variantId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {variant?.name || variantId}
            </h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Weight: {variant?.weight}%
            </div>
          </div>
          {results?.winningVariant === variantId && (
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm font-medium">
              Winner
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {renderMetricCard('Total Users', formatNumber(metrics.totalUsers))}
          {renderMetricCard('Total Events', formatNumber(metrics.totalEvents))}
          {renderMetricCard(
            'Conversion Rate',
            formatPercentage(metrics.conversionRate),
            getMetricColor(metrics.conversionRate, 10)
          )}
          {renderMetricCard(
            'Conversions',
            formatNumber(metrics.conversions),
            'text-blue-600 dark:text-blue-400'
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {renderMetricCard(
            'Avg Session Duration',
            formatDuration(metrics.avgSessionDuration),
            'text-gray-700 dark:text-gray-300'
          )}
          {renderMetricCard(
            'Events per User',
            metrics.avgEventsPerUser.toFixed(2),
            'text-gray-700 dark:text-gray-300'
          )}
          {renderMetricCard(
            'Bounce Rate',
            formatPercentage(metrics.bounceRate),
            getMetricColor(metrics.bounceRate, 50, true)
          )}
          {renderMetricCard(
            'Error Rate',
            formatPercentage(metrics.errorRate),
            getMetricColor(metrics.errorRate, 5, true)
          )}
        </div>

        {metrics.customMetrics && Object.keys(metrics.customMetrics).length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Custom Metrics
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(metrics.customMetrics).map(([key, value]) => (
                <div key={key} className="text-sm">
                  <div className="text-gray-600 dark:text-gray-400">{key}</div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {typeof value === 'number' ? value.toFixed(2) : value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (experiments.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="text-gray-500 dark:text-gray-400 mb-4">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <p className="text-lg font-medium">No A/B Tests Active</p>
          <p className="text-sm mt-2">
            Create an experiment to start tracking user behavior and testing variations
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              A/B Test Dashboard
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Monitor experiment performance and analyze user behavior
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDebugInfo(!showDebugInfo)}
              className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {showDebugInfo ? 'Hide' : 'Show'} Debug Info
            </button>
            <button
              onClick={handleExportData}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Export Data
            </button>
          </div>
        </div>

        {/* Debug Info */}
        {showDebugInfo && (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-700">
            <div className="text-sm font-mono">
              <div className="mb-2">
                <span className="text-gray-600 dark:text-gray-400">User ID:</span>{' '}
                <span className="text-gray-900 dark:text-white">{userId}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Session ID:</span>{' '}
                <span className="text-gray-900 dark:text-white">{sessionId}</span>
              </div>
            </div>
          </div>
        )}

        {/* Experiment Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Experiment
          </label>
          <select
            value={selectedExperiment || ''}
            onChange={(e) => setSelectedExperiment(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {experiments.map((exp) => (
              <option key={exp.id} value={exp.id}>
                {exp.name} ({exp.enabled ? 'Active' : 'Inactive'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      {results && (
        <>
          {/* Summary Card */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
            <h3 className="text-xl font-bold mb-4">Experiment Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-blue-100 text-sm mb-1">Statistical Significance</div>
                <div className="text-2xl font-bold">
                  {results.isSignificant ? 'Yes' : 'No'}
                  {results.confidenceLevel && ` (${results.confidenceLevel.toFixed(1)}%)`}
                </div>
              </div>
              {results.winningVariant && (
                <>
                  <div>
                    <div className="text-blue-100 text-sm mb-1">Winning Variant</div>
                    <div className="text-2xl font-bold">
                      {experiments
                        .find((e) => e.id === selectedExperiment)
                        ?.variants.find((v) => v.id === results.winningVariant)?.name ||
                        results.winningVariant}
                    </div>
                  </div>
                  <div>
                    <div className="text-blue-100 text-sm mb-1">Improvement</div>
                    <div className="text-2xl font-bold">
                      {results.improvement ? `+${results.improvement.toFixed(2)}%` : 'N/A'}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Recommendations */}
          {results.recommendations && results.recommendations.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-200 mb-3">
                Recommendations
              </h3>
              <ul className="space-y-2">
                {results.recommendations.map((rec, index) => (
                  <li
                    key={index}
                    className="flex items-start text-amber-800 dark:text-amber-300"
                  >
                    <svg
                      className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Variant Metrics */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Variant Performance
            </h3>
            {Array.from(results.variantMetrics.entries()).map(([variantId, metrics]) =>
              renderVariantMetrics(variantId, metrics)
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ABTestDashboard;
