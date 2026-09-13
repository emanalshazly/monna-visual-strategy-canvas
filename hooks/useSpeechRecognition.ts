import { useState, useRef, useEffect, useCallback } from 'react';

// For browser SpeechRecognition
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

export interface SpeechRecognitionHook {
    isListening: boolean;
    isSupported: boolean;
    error: string;
    transcript: {
        interim: string;
        final: string;
    };
    confidence: number;
    toggleListening: () => void;
    stopListening: () => void;
    startListening: (lang: string) => void;
    clearTranscript: () => void;
}

export const useSpeechRecognition = (): SpeechRecognitionHook => {
    const [isListening, setIsListening] = useState<boolean>(false);
    const [isSupported, setIsSupported] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [transcript, setTranscript] = useState({ interim: '', final: '' });
    const [confidence, setConfidence] = useState(0);
    const recognitionRef = useRef<any>(null);
    const isListeningRef = useRef(false);

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
            let interimTranscript = '';
            let finalTranscript = '';
            let lastConfidence = 0;

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                    lastConfidence = event.results[i][0].confidence;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            
            setTranscript(prev => ({
                interim: interimTranscript,
                final: prev.final + finalTranscript,
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
            }
        };
        
        return () => {
             if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const startListening = useCallback((lang: string = 'en-US') => {
        if (recognitionRef.current && !isListening) {
            try {
                recognitionRef.current.lang = lang;
                recognitionRef.current.start();
                isListeningRef.current = true;
                setIsListening(true);
                setError('');
            } catch (err) {
                console.error("Error starting recognition:", err);
                setError("Could not start microphone. It might be in use by another application.");
            }
        }
    }, [isListening]);

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
        setTranscript({ interim: '', final: '' });
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
    };
};
