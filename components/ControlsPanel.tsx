import React from 'react';
import { CanvasType } from '../types';
import { MicIcon, UploadIcon, ExportIcon, BrainCircuitIcon, XCircleIcon, InfoIcon } from './IconComponents';
import { CANVAS_TEMPLATES } from '../constants';

interface ControlsPanelProps {
    canvasType: CanvasType;
    setCanvasType: (type: CanvasType) => void;
    userInput: string;
    setUserInput: (input: string) => void;
    fileContent: string;
    handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    imagePreviewUrl: string | null;
    handleImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    removeImage: () => void;
    handleGenerate: () => void;
    onCancel: () => void;
    isLoading: boolean;
    isCanvasPopulated: boolean;
    onExport: () => void;
    onOpenVoiceModal: () => void;
    error: string;
}

const ControlsPanel: React.FC<ControlsPanelProps> = ({
    canvasType,
    setCanvasType,
    userInput,
    setUserInput,
    fileContent,
    handleFileChange,
    imagePreviewUrl,
    handleImageChange,
    removeImage,
    handleGenerate,
    onCancel,
    isLoading,
    isCanvasPopulated,
    onExport,
    onOpenVoiceModal,
    error,
}) => {
    return (
        <div className="w-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-xs p-6 rounded-xl shadow-enhanced border border-slate-200/50 dark:border-slate-700/50 flex flex-col space-y-6">
            <div>
                <label htmlFor="canvas-type" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">1. Select Canvas Type</label>
                <select
                    id="canvas-type"
                    value={canvasType}
                    onChange={(e) => setCanvasType(e.target.value as CanvasType)}
                    className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all duration-200 shadow-xs hover:shadow-md"
                >
                    <option value={CanvasType.BUSINESS_MODEL_CANVAS}>Business Model Canvas</option>
                    <option value={CanvasType.PORTERS_FIVE_FORCES}>Porter's Five Forces</option>
                    <option value={CanvasType.SWOT_ANALYSIS}>SWOT Analysis</option>
                    <option value={CanvasType.VALUE_PROPOSITION_CANVAS}>Value Proposition Canvas</option>
                </select>
                <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-400 min-h-[60px] transition-all duration-300 flex items-start space-x-3">
                    <InfoIcon className="h-5 w-5 shrink-0 mt-0.5 text-slate-500" />
                    <span>{CANVAS_TEMPLATES[canvasType]?.description || 'Select a canvas to see its description.'}</span>
                </div>
            </div>

            <div>
                <label htmlFor="user-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">2. Describe Your Strategy</label>
                <textarea
                    id="user-input"
                    rows={8}
                    className="w-full p-4 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all duration-200 shadow-xs hover:shadow-md custom-scrollbar resize-none"
                    placeholder="Describe your business idea, product, or strategy here..."
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                />
                <button
                    onClick={onOpenVoiceModal}
                    className="mt-3 w-full flex items-center justify-center p-3 rounded-lg transition-all duration-200 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                    <MicIcon className="h-5 w-5 mr-2" />
                    Advanced Voice Input
                </button>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">3. (Optional) Add Context</label>
                <div className="space-y-3">
                    <label className="w-full flex items-center justify-center p-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-md cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700">
                        <UploadIcon className="h-5 w-5 mr-2 text-slate-500"/>
                        <span className="text-sm text-slate-600 dark:text-slate-400">{fileContent ? "Text file loaded" : "Upload document (.txt)"}</span>
                        <input id="file-upload" type="file" accept=".txt" className="hidden" onChange={handleFileChange} />
                    </label>
                    
                    {imagePreviewUrl ? (
                         <div className="relative">
                             <img src={imagePreviewUrl} alt="Preview" className="w-full h-auto rounded-md" />
                             <button onClick={removeImage} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/75">
                                 <XCircleIcon className="w-6 h-6"/>
                             </button>
                         </div>
                    ) : (
                        <label className="w-full flex items-center justify-center p-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-md cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700">
                             <UploadIcon className="h-5 w-5 mr-2 text-slate-500"/>
                            <span className="text-sm text-slate-600 dark:text-slate-400">Upload image</span>
                            <input id="image-upload" type="file" accept="image/png, image/jpeg, image/webp" className="hidden" onChange={handleImageChange} />
                        </label>
                    )}
                </div>
            </div>
            
            <button
                onClick={handleGenerate}
                disabled={isLoading || !userInput.trim()}
                className="w-full btn-primary text-white font-bold py-4 px-6 rounded-xl hover:shadow-xl disabled:bg-slate-400 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center text-lg shadow-enhanced-hover"
            >
                <BrainCircuitIcon className="h-6 w-6 mr-3" />
                {isLoading ? (
                    <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                        Generating Canvas...
                    </>
                ) : (
                    'Generate Canvas'
                )}
            </button>

            {isLoading && (
                <button
                    type="button"
                    onClick={onCancel}
                    className="w-full border border-slate-300 dark:border-slate-600 font-semibold py-2 px-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                    Cancel generation
                </button>
            )}

            {isCanvasPopulated && (
               <button
                   onClick={onExport}
                   className="w-full btn-success text-white font-bold py-3 px-4 rounded-xl shadow-enhanced-hover flex items-center justify-center"
               >
                   <ExportIcon className="h-5 w-5 mr-2" />
                   Export Canvas
               </button>
            )}

            {error && (
                <div role="alert" className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-fade-in-up">
                    <div className="flex items-start">
                        <div className="shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(ControlsPanel);
