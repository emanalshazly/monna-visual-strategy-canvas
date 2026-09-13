import React from 'react';
import { AnalysisFeedback } from '../types';
import { ShieldCheckIcon, LightbulbIcon, CloseIcon } from './IconComponents';

interface AnalysisPanelProps {
  analysis: AnalysisFeedback;
  onDismiss: () => void;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ analysis, onDismiss }) => {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg animate-fade-in-up">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI Strategic Analysis</h2>
        <button
          onClick={onDismiss}
          className="p-1 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
          aria-label="Dismiss analysis"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center mb-2">
            <ShieldCheckIcon className="w-6 h-6 mr-2 text-green-500" />
            Strengths
          </h3>
          <div className="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 space-y-2">
            {analysis.strengths.split('\n').map((line, index) => line.trim() && <p key={index} className="my-1">{line.replace(/^- /, '• ')}</p>)}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center mb-2">
            <LightbulbIcon className="w-6 h-6 mr-2 text-yellow-500" />
            Suggestions for Improvement
          </h3>
          <div className="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 space-y-2">
             {analysis.suggestions.split('\n').map((line, index) => line.trim() && <p key={index} className="my-1">{line.replace(/^- /, '• ')}</p>)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(AnalysisPanel);