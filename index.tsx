
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ABTestProvider } from './contexts/ABTestContext';
import { allExperiments, allConversionGoals } from './config/experiments';
import './styles.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ABTestProvider
      config={{
        persistAssignments: true,
        trackingEnabled: true,
        debugMode: import.meta.env.DEV,
        sampleRate: 100, // Include 100% of users in experiments
      }}
      experiments={allExperiments}
      conversionGoals={allConversionGoals}
    >
      <App />
    </ABTestProvider>
  </React.StrictMode>
);
