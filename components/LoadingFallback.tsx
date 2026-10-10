import React from 'react';

interface LoadingFallbackProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const LoadingFallback: React.FC<LoadingFallbackProps> = ({ 
  message = 'Loading...', 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-xs z-50 flex justify-center items-center">
      <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-slate-200/50 dark:border-slate-700/50 flex flex-col items-center space-y-4">
        <div className="relative">
          <div className={`animate-spin rounded-full ${sizeClasses[size]} border-4 border-blue-200 dark:border-blue-900`}></div>
          <div className={`animate-spin rounded-full ${sizeClasses[size]} border-4 border-blue-600 border-t-transparent absolute top-0 left-0`}></div>
        </div>
        <p className="text-slate-700 dark:text-slate-300 font-medium">{message}</p>
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{animationDelay: '0.1s'}}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingFallback;