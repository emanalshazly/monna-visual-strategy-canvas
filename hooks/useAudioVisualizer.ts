import { useRef, useCallback } from 'react';

export const useAudioVisualizer = (canvasRef: React.RefObject<HTMLCanvasElement | null>) => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameIdRef = useRef<number | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);

    const draw = useCallback(() => {
        if (!analyserRef.current || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        if (!ctx) return;
        
        analyserRef.current.getByteTimeDomainData(dataArray);

        ctx.fillStyle = 'rgb(241 245 249)'; // slate-100
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgb(37 99 235)'; // blue-600
        ctx.beginPath();
        
        const sliceWidth = canvas.width * 1.0 / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * canvas.height / 2;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            x += sliceWidth;
        }

        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();

        animationFrameIdRef.current = requestAnimationFrame(draw);
    }, [canvasRef]);

    const start = useCallback(async () => {
        try {
            mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContextRef.current = new window.AudioContext();
            analyserRef.current = audioContextRef.current.createAnalyser();
            sourceRef.current = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
            sourceRef.current.connect(analyserRef.current);
            draw();
        } catch (err) {
            console.error('Error accessing microphone:', err);
            // Handle error (e.g., show a message to the user)
        }
    }, [draw]);

    const stop = useCallback(() => {
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }

        // Clear the canvas
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = 'rgb(241 245 249)'; // slate-100
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }
    }, [canvasRef]);

    return { start, stop };
};
