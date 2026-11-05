import { useState, useRef, useEffect, useCallback } from 'react';

// For browser SpeechRecognition
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

export interface RecognitionResult {
    id: string;
    text: string;
}

export interface SpeechRecognitionHook {
    isListening: boolean;
    isSupported: boolean;
    error: string;
    transcript: {
        interim: RecognitionResult[];
        final: RecognitionResult[];
    };
    confidence: number;
    toggleListening: () => void;
    stopListening: () => void;
    startListening: (lang: string) => void;
    clearTranscript: () => void;
    acknowledgeFinalResults: (ids: string[]) => void;
}

export const useSpeechRecognition = (): SpeechRecognitionHook => {
    const [isListening, setIsListening] = useState<boolean>(false);
    const [isSupported, setIsSupported] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [transcript, setTranscript] = useState<SpeechRecognitionHook['transcript']>({ interim: [], final: [] });
    const [confidence, setConfidence] = useState(0);
    const recognitionRef = useRef<any>(null);
    const isListeningRef = useRef(false);
    const sessionRef = useRef(0);
    const deliveredFinalIds = useRef(new Set<string>());

    const beginSession = useCallback(() => {
        sessionRef.current += 1;
        deliveredFinalIds.current.clear();
        // Retain queued finals, but hypotheses from the ended session are stale.
        setTranscript(prev => ({ interim: [], final: prev.final }));
    }, []);

    useEffect(() => {
        if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
            setError('Speech recognition is not supported in this browser.');
            setIsSupported(false);
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        const recognition = recognitionRef.current;
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
            const interimResults: RecognitionResult[] = [];
            const finalResults: RecognitionResult[] = [];
            let lastConfidence = 0;

            for (let i = 0; i < event.results.length; ++i) {
                const result = { id: `${sessionRef.current}:${i}`, text: event.results[i][0].transcript };
                if (event.results[i].isFinal) {
                    if (i >= event.resultIndex && !deliveredFinalIds.current.has(result.id)) {
                        deliveredFinalIds.current.add(result.id);
                        finalResults.push(result);
                        lastConfidence = event.results[i][0].confidence;
                    }
                } else {
                    interimResults.push(result);
                }
            }
            
            setTranscript(prev => ({
                interim: interimResults,
                final: [...prev.final, ...finalResults],
            }));
            if (lastConfidence > 0) {
                setConfidence(lastConfidence);
            }
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setError(`Speech recognition error: ${event.error}`);
            isListeningRef.current = false;
            setIsListening(false);
        };

        recognition.onend = () => {
            if (isListeningRef.current) {
                 // Restart listening if it was stopped unexpectedly
                recognition.start();
                beginSession();
            }
        };
        
        return () => {
             if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [beginSession]);

    const startListening = useCallback((lang: string = 'en-US') => {
        if (recognitionRef.current && !isListening) {
            try {
                recognitionRef.current.lang = lang;
                recognitionRef.current.start();
                beginSession();
                isListeningRef.current = true;
                setIsListening(true);
                setError('');
            } catch (err) {
                console.error("Error starting recognition:", err);
                setError("Could not start microphone. It might be in use by another application.");
            }
        }
    }, [isListening, beginSession]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
            isListeningRef.current = false;
            setIsListening(false);
        }
    }, [isListening]);

    const toggleListening = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            startListening('en-US'); // Default language
        }
    }, [isListening, startListening, stopListening]);

    const clearTranscript = useCallback(() => {
        setTranscript({ interim: [], final: [] });
    }, []);

    const acknowledgeFinalResults = useCallback((ids: string[]) => {
        setTranscript(prev => ({ ...prev, final: prev.final.filter(result => !ids.includes(result.id)) }));
    }, []);

    return {
        isListening,
        isSupported,
        error,
        transcript,
        confidence,
        toggleListening,
        stopListening,
        startListening,
        clearTranscript,
        acknowledgeFinalResults,
    };
};
