import React, { useState, useRef, useCallback, lazy, Suspense } from 'react';
import { CanvasType, AnalysisFeedback } from './types';
import { CANVAS_TEMPLATES } from './constants';
import { analyzeAndGenerateCanvas, refineBlockContent } from './services/analysisClient';
import { useCanvas } from './hooks/useCanvas';
import { useAnalytics } from './hooks/useABTest';
import { AnalyticsEventType } from './types/abTesting';
import ControlsPanel from './components/ControlsPanel';
import CanvasDisplay from './components/CanvasDisplay';
import AnalysisPanel from './components/AnalysisPanel';
import LoadingFallback from './components/LoadingFallback';
import { BrainCircuitIcon } from './components/IconComponents';

// Lazy load modal components
const EditModal = lazy(() => import('./components/EditModal'));
const ExportModal = lazy(() => import('./components/ExportModal'));
const VoiceInputModal = lazy(() => import('./components/VoiceInputModal'));
const ABTestDashboard = lazy(() => import('./components/ABTestDashboard'));


interface ImageState {
    data: string; // base64
    mimeType: string;
    previewUrl: string; // data URL for <img> src
}

const App: React.FC = () => {
    const isPagesDemo = import.meta.env.VITE_GITHUB_PAGES_DEMO === 'true';
    const {
        canvasType,
        setCanvasType,
        canvasData,
        setCanvasData,
        editingBlock,
        handleEditBlock,
        handleSaveEdit,
        handleCloseModal,
        clearCanvas,
    } = useCanvas(CanvasType.BUSINESS_MODEL_CANVAS);

    const { trackEvent } = useAnalytics();

    const [userInput, setUserInput] = useState<string>('');
    const [fileContent, setFileContent] = useState<string>('');
    const [image, setImage] = useState<ImageState | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
    const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
    const [analysisFeedback, setAnalysisFeedback] = useState<AnalysisFeedback | null>(null);
    const [showABTestDashboard, setShowABTestDashboard] = useState<boolean>(false);

    const canvasRef = useRef<HTMLDivElement>(null);
    const activeRequestRef = useRef<AbortController | null>(null);
    
    const handleGenerate = useCallback(async () => {
        if (isLoading) return;
        if (!userInput.trim()) {
            setError('Please provide a description of your business strategy.');
            return;
        }
        setError('');
        setIsLoading(true);
        clearCanvas();
        setAnalysisFeedback(null);
        const controller = new AbortController();
        activeRequestRef.current = controller;

        // Track canvas generation start
        trackEvent(AnalyticsEventType.BUTTON_CLICK, {
            action: 'generate-canvas',
            canvasType,
            hasFile: !!fileContent,
            hasImage: !!image,
        });

        try {
            const imageData = image ? { data: image.data, mimeType: image.mimeType } : undefined;
            const result = await analyzeAndGenerateCanvas(canvasType, userInput, fileContent, imageData, controller.signal);
            setCanvasData(result.canvasData);
            setAnalysisFeedback(result.analysisFeedback);

            // Track successful canvas generation
            trackEvent(AnalyticsEventType.CANVAS_GENERATED, {
                canvasType,
                hasAnalysis: !!result.analysisFeedback,
            });

            // Check if this is the user's first canvas
            const hasGeneratedBefore = localStorage.getItem('has_generated_canvas');
            if (!hasGeneratedBefore) {
                trackEvent(AnalyticsEventType.FIRST_CANVAS_CREATED, { canvasType });
                localStorage.setItem('has_generated_canvas', 'true');
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred.';
            if (err instanceof Error && err.name === 'AbortError') {
                setError('Generation cancelled.');
                return;
            }
            setError(message);
            trackEvent(AnalyticsEventType.ERROR_OCCURRED, {
                error: message,
                context: 'canvas-generation',
            });
        } finally {
            activeRequestRef.current = null;
            setIsLoading(false);
        }
    }, [userInput, fileContent, image, canvasType, setCanvasData, clearCanvas, trackEvent, isLoading]);

    const handleCancel = useCallback(() => {
        activeRequestRef.current?.abort();
    }, []);
    
    const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type && file.type !== 'text/plain') {
                setError('Only plain-text documents are supported.');
                return;
            }
            if (file.size > 100_000) {
                setError('The text document must be 100 KB or smaller.');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                setFileContent(text);
                setError('');
            };
            reader.readAsText(file);
        }
    }, []);

    const handleImageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
                setError('Only PNG, JPEG, and WebP images are supported.');
                return;
            }
            if (file.size > 6_000_000) {
                setError('The image must be 6 MB or smaller.');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                const base64Data = dataUrl.split(',')[1];
                setImage({
                    data: base64Data,
                    mimeType: file.type,
                    previewUrl: dataUrl
                });
                setError('');
            };
            reader.readAsDataURL(file);
        }
    }, []);

    const removeImage = useCallback(() => setImage(null), []);

    const handleVoiceInputSave = useCallback((finalTranscript: string) => {
        setUserInput(finalTranscript);
        setIsVoiceModalOpen(false);
        trackEvent(AnalyticsEventType.VOICE_RECORDING_COMPLETED, {
            transcriptLength: finalTranscript.length,
        });
    }, [trackEvent]);

    const handleRefine = useCallback(async (currentContent: string): Promise<string> => {
        if (!editingBlock) return currentContent;
        setError('');
        try {
            return await refineBlockContent(editingBlock.title, currentContent, userInput);
        } catch (err: any) {
            setError(err.message || 'An unknown error occurred during refinement.');
            return currentContent; 
        }
    }, [editingBlock, userInput]);
    
    const currentTemplate = CANVAS_TEMPLATES[canvasType];

    return (
        <div className="min-h-screen flex flex-col text-slate-800 dark:text-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs shadow-enhanced p-4 flex items-center justify-between sticky top-0 z-40 border-b border-slate-200/50 dark:border-slate-700/50">
                <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                        <BrainCircuitIcon className="h-8 w-8 text-white"/>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Visual Strategy Canvas AI</h1>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            {isPagesDemo ? 'Deterministic GitHub Pages demo · no model call' : 'Transform ideas into strategic insights'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowABTestDashboard(!showABTestDashboard)}
                    className="px-4 py-2 text-sm bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors flex items-center gap-2"
                    title="Toggle A/B Test Dashboard"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    {showABTestDashboard ? 'Hide' : 'Show'} Analytics
                </button>
            </header>
            
            <main className="grow flex flex-col md:flex-row p-4 gap-4">
                <div className="w-full md:w-1/3 lg:w-1/4 flex flex-col gap-4 self-start md:sticky md:top-24">
                    <ControlsPanel
                        canvasType={canvasType}
                        setCanvasType={setCanvasType}
                        userInput={userInput}
                        setUserInput={setUserInput}
                        fileContent={fileContent}
                        handleFileChange={handleFileChange}
                        handleImageChange={handleImageChange}
                        removeImage={removeImage}
                        imagePreviewUrl={image?.previewUrl || null}
                        handleGenerate={handleGenerate}
                        onCancel={handleCancel}
                        isLoading={isLoading}
                        isCanvasPopulated={Object.keys(canvasData).length > 0}
                        onExport={() => setIsExportModalOpen(true)}
                        onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
                        error={error}
                    />
                    {analysisFeedback && (
                        <AnalysisPanel 
                            analysis={analysisFeedback} 
                            onDismiss={() => setAnalysisFeedback(null)} 
                        />
                    )}
                </div>

                <CanvasDisplay
                    isLoading={isLoading}
                    currentTemplate={currentTemplate}
                    canvasData={canvasData}
                    handleEditBlock={handleEditBlock}
                    canvasRef={canvasRef}
                />
            </main>
            
            <Suspense fallback={<LoadingFallback message="Loading component..." size="sm" />}>
                <EditModal
                    isOpen={!!editingBlock}
                    title={editingBlock?.title || ''}
                    initialContent={editingBlock?.content || ''}
                    onClose={handleCloseModal}
                    onSave={handleSaveEdit}
                    onRefine={handleRefine}
                />
                
                <ExportModal
                    isOpen={isExportModalOpen}
                    onClose={() => setIsExportModalOpen(false)}
                    canvasRef={canvasRef}
                    canvasName={currentTemplate.name}
                />

                <VoiceInputModal
                    isOpen={isVoiceModalOpen}
                    onClose={() => setIsVoiceModalOpen(false)}
                    onSave={handleVoiceInputSave}
                    initialTranscript={userInput}
                />
            </Suspense>

            {/* A/B Test Dashboard Modal */}
            {showABTestDashboard && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 overflow-y-auto">
                    <div className="min-h-screen px-4 py-8">
                        <div className="max-w-7xl mx-auto bg-white dark:bg-gray-900 rounded-lg shadow-2xl">
                            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center rounded-t-lg z-10">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    A/B Testing Analytics Dashboard
                                </h2>
                                <button
                                    onClick={() => setShowABTestDashboard(false)}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-6">
                                <Suspense fallback={<LoadingFallback message="Loading analytics..." size="lg" />}>
                                    <ABTestDashboard />
                                </Suspense>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
