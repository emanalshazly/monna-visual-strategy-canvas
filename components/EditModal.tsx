import React, { useState, useEffect } from 'react';
import { SparklesIcon } from './IconComponents';

interface EditModalProps {
  isOpen: boolean;
  title: string;
  initialContent: string;
  onClose: () => void;
  onSave: (newContent: string) => void;
  onRefine: (currentContent: string) => Promise<string>;
}

const EditModal: React.FC<EditModalProps> = ({ isOpen, title, initialContent, onClose, onSave, onRefine }) => {
  const [content, setContent] = useState(initialContent);
  const [isRefining, setIsRefining] = useState(false);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    onSave(content);
  };

  const handleRefine = async () => {
    setIsRefining(true);
    try {
        const refinedContent = await onRefine(content);
        setContent(refinedContent);
    } catch {
        // Error is handled by parent, but we stop loading
        console.error("Refinement failed in modal");
    } finally {
        setIsRefining(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl transform transition-all">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">Editing: {title}</h2>
          <textarea
            className="w-full h-64 p-3 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter your content here..."
          />
        </div>
        <div className="bg-slate-100 dark:bg-slate-700 px-6 py-4 flex justify-between items-center rounded-b-lg">
           <button
            onClick={handleRefine}
            disabled={isRefining}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center disabled:bg-purple-400"
          >
            <SparklesIcon className="h-5 w-5 mr-2" />
            {isRefining ? 'Refining...' : 'Refine with AI'}
          </button>
          <div className="flex space-x-3">
            <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 transition-colors dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"
            >
                Cancel
            </button>
            <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
                Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditModal;
