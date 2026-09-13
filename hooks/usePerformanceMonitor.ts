import { useEffect, useRef } from 'react';

/**
 * Hook to monitor component render performance
 * @param componentName - Name of the component being monitored
 * @param enabled - Whether to enable monitoring (default: false in production)
 */
export function usePerformanceMonitor(
  componentName: string,
  enabled: boolean = import.meta.env.DEV
): void {
  const renderStartTime = useRef<number>(performance.now());

  useEffect(() => {
    if (!enabled) return;

    const renderEndTime = performance.now();
    const renderTime = renderEndTime - renderStartTime.current;

    if (renderTime > 16) { // Flag renders taking longer than 16ms (60fps threshold)
      console.warn(`🐌 Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
    } else {
      console.log(`⚡ ${componentName} rendered in ${renderTime.toFixed(2)}ms`);
    }

    // Reset for next render
    renderStartTime.current = performance.now();
  });

  // Update start time on each render
  renderStartTime.current = performance.now();
}

/**
 * Hook to measure and log function execution time
 * @param functionName - Name of the function being measured
 * @param enabled - Whether to enable monitoring
 */
export function useFunctionPerformance(
  functionName: string,
  enabled: boolean = import.meta.env.DEV
) {
  return <T extends (...args: any[]) => any>(fn: T): T => {
    if (!enabled) return fn;

    return ((...args: any[]) => {
      const startTime = performance.now();
      const result = fn(...args);
      
      if (result instanceof Promise) {
        return result.finally(() => {
          const endTime = performance.now();
          console.log(`⏱️ Async ${functionName} completed in ${(endTime - startTime).toFixed(2)}ms`);
        });
      } else {
        const endTime = performance.now();
        console.log(`⏱️ ${functionName} executed in ${(endTime - startTime).toFixed(2)}ms`);
        return result;
      }
    }) as T;
  };
}
