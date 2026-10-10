import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useAudioVisualizer } from '../hooks/useAudioVisualizer';
import { MicIcon, CheckIcon, CloseIcon, SettingsIcon } from './IconComponents';

interface VoiceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (finalTranscript: string) => void;
  initialTranscript: string;
}

const LANGUAGES = [
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'es-ES', name: 'Español (España)' },
    { code: 'fr-FR', name: 'Français' },
    { code: 'de-DE', name: 'Deutsch' },
    { code: 'it-IT', name: 'Italiano' },
    { code: 'ja-JP', name: '日本語' },
    { code: 'ko-KR', name: '한국어' },
    { code: 'zh-CN', name: '中文 (Mandarin)'},
];

const VoiceInputModal: React.FC<VoiceInputModalProps> = ({ isOpen, onClose, onSave, initialTranscript }) => {
    const {
        isListening,
        isSupported,
        error: speechError,
        transcript,
        confidence,
        startListening,
        stopListening,
        clearTranscript,
    } = useSpeechRecognition();

    const [text, setText] = useState(initialTranscript);
    const [language, setLanguage] = useState('en-US');
    const [showSettings, setShowSettings] = useState(false);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { start: startVisualizer, stop: stopVisualizer } = useAudioVisualizer(canvasRef);

    const handleStop = useCallback(() => {
        if (isListening) {
            stopListening();
            stopVisualizer();
        }
    }, [isListening, stopListening, stopVisualizer]);
    
    useEffect(() => {
        setText(initialTranscript);
    }, [initialTranscript]);

    useEffect(() => {
        if (isOpen) {
            clearTranscript();
            setText(initialTranscript);
        } else {
            stopListening();
            stopVisualizer();
            setShowSettings(false);
        }
    }, [isOpen, clearTranscript, initialTranscript, stopListening, stopVisualizer]);

    useEffect(() => {
        if(transcript.final) {
            // Voice command processing
            const command = transcript.final.toLowerCase().trim();
            if (command.includes('stop recording')) {
                handleStop();
            } else if (command.includes('clear text')) {
                setText('');
                clearTranscript();
            } else {
                 setText(prev => (prev ? prev + ' ' : '') + transcript.final);
            }
            clearTranscript();
        }
    }, [transcript.final, clearTranscript, handleStop]);
    
    const handleStart = () => {
        if (!isListening) {
            setText(''); // Clear text on new recording session
            startListening(language);
            startVisualizer();
        }
    };
    
    const handleSave = () => {
        onSave(text);
    };
    
    if (!isOpen) return null;

    const fullTranscript = text + (transcript.interim ? (text ? ' ' : '') + transcript.interim : '');
    const confidencePercentage = (confidence * 100).toFixed(0);

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex justify-center items-center p-4 modal-backdrop" aria-modal="true" role="dialog">
            <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col transform transition-all border border-slate-200/50 dark:border-slate-700/50">
                <header className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Advanced Voice Input</h2>
                    <div className="flex items-center space-x-2">
                        <button onClick={() => setShowSettings(!showSettings)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                             <SettingsIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                        </button>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                           <CloseIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                        </button>
                    </div>
                </header>

                <div className={`p-4 bg-slate-50 dark:bg-slate-700/50 ${showSettings ? 'block' : 'hidden'}`}>
                    <label htmlFor="language-select" className="text-sm font-medium text-slate-700 dark:text-slate-300">Language:</label>
                    <select
                        id="language-select"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        disabled={isListening}
                        className="mt-1 w-full md:w-1/2 p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    >
                        {LANGUAGES.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">Select your language before starting the recording.</p>
                </div>

                <main className="grow p-6 flex flex-col">
                    <div className="relative w-full h-24 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-900/50 dark:to-slate-800/50 rounded-xl overflow-hidden mb-4 shadow-inner border border-slate-200/50 dark:border-slate-700/50">
                        <canvas ref={canvasRef} width="800" height="96" className="absolute top-0 left-0 w-full h-full waveform-canvas"></canvas>
                        {!isListening && (
                            <div className="absolute inset-0 flex justify-center items-center">
                                <p className="text-slate-400 dark:text-slate-500">Press the record button to start</p>
                            </div>
                        )}
                    </div>
                    <textarea
                        className="w-full grow p-3 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden resize-none"
                        value={fullTranscript}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Your transcribed text will appear here..."
                    />
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 h-4">
                        {isListening && `Confidence: ${confidencePercentage}%`}
                        {speechError && <span className="text-red-500">{speechError}</span>}
                        {!isSupported && <span className="text-red-500">Speech recognition not supported in this browser.</span>}
                    </div>
                </main>

                <footer className="bg-slate-100 dark:bg-slate-900/50 px-6 py-4 flex flex-col sm:flex-row justify-between items-center rounded-b-lg space-y-4 sm:space-y-0">
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                        Try saying: <em className="text-slate-800 dark:text-slate-200">"clear text"</em> or <em className="text-slate-800 dark:text-slate-200">"stop recording"</em>.
                    </div>
                    <div className="flex items-center space-x-4">
                        {isListening ? (
                             <button
                                onClick={handleStop}
                                className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold rounded-full hover:from-red-600 hover:to-red-700 transition-all duration-200 flex items-center shadow-xl recording-pulse transform hover:scale-105"
                                >
                                <MicIcon className="h-6 w-6 mr-3 animate-pulse" />
                                Stop Recording
                            </button>
                        ) : (
                             <button
                                onClick={handleStart}
                                disabled={!isSupported}
                                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-full hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center shadow-xl disabled:bg-slate-400 disabled:cursor-not-allowed transform hover:scale-105"
                                >
                                <MicIcon className="h-6 w-6 mr-3" />
                                Start Recording
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-full hover:from-green-600 hover:to-green-700 transition-all duration-200 flex items-center shadow-xl transform hover:scale-105"
                        >
                           <CheckIcon className="h-6 w-6 mr-2" />
                           Save & Close
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default VoiceInputModal;
