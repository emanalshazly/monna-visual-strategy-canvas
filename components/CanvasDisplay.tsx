import React from 'react';
import { CanvasData, CanvasTemplate } from '../types';
import SVGCanvas from './SVGCanvas';

interface CanvasDisplayProps {
    isLoading: boolean;
    currentTemplate: CanvasTemplate;
    canvasData: CanvasData;
    handleEditBlock: (id: string, title: string, content: string) => void;
    canvasRef: React.RefObject<HTMLDivElement | null>;
}

const CanvasDisplay: React.FC<CanvasDisplayProps> = ({ isLoading, currentTemplate, canvasData, handleEditBlock, canvasRef }) => {
    return (
        <div className="w-full md:w-2/3 lg:w-3/4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm p-6 rounded-xl shadow-enhanced border border-slate-200/50 dark:border-slate-700/50 flex flex-col">
            {isLoading ? (
                <div role="status" aria-live="polite" className="flex flex-col justify-center items-center h-full min-h-[50vh] flex-grow">
                    <div className="relative">
                        <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-200 dark:border-blue-900"></div>
                        <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
                    </div>
                    <div className="mt-6 text-center">
                        <p className="text-xl font-semibold text-slate-800 dark:text-slate-200">AI is thinking...</p>
                        <p className="text-slate-600 dark:text-slate-400 mt-2">Generating your {currentTemplate.name}</p>
                        <div className="flex justify-center mt-4">
                            <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{animationDelay: '0.1s'}}></div>
                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div ref={canvasRef} id="canvas-export" className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 p-6 w-full flex-grow rounded-xl shadow-inner border border-slate-200/50 dark:border-slate-700/50">
                   {Object.keys(canvasData).length > 0 ? (
                        <SVGCanvas
                            template={currentTemplate}
                            data={canvasData}
                            onEditBlock={handleEditBlock}
                        />
                    ) : (
                        <div className="flex justify-center items-center h-full">
                            <p className="text-slate-500 dark:text-slate-400 text-lg">Your generated canvas will appear here.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default React.memo(CanvasDisplay);
