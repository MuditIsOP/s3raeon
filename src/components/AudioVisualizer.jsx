import { useEffect, useRef } from 'react';

function AudioVisualizer({ stream, audioRef, isRecording }) {
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const sourceRef = useRef(null);
    const analyserRef = useRef(null);
    const animationRef = useRef(null);

    useEffect(() => {
        if (!stream && !audioRef?.current) return;

        const initAudio = async () => {
            try {
                if (!contextRef.current) {
                    contextRef.current = new (window.AudioContext || window.webkitAudioContext)();
                }

                const ctx = contextRef.current;

                // Resume context if suspended (browser policy)
                if (ctx.state === 'suspended') {
                    await ctx.resume();
                }

                if (!analyserRef.current) {
                    analyserRef.current = ctx.createAnalyser();
                    analyserRef.current.fftSize = 256;
                    analyserRef.current.smoothingTimeConstant = 0.8;
                }

                // Disconnect old source
                if (sourceRef.current) {
                    // We don't necessarily need to disconnect if we handle it right, 
                    // but cleaner to restart graph if source changes type
                }

                if (isRecording && stream) {
                    // Input stream (Recording)
                    if (sourceRef.current) sourceRef.current.disconnect();
                    sourceRef.current = ctx.createMediaStreamSource(stream);
                    sourceRef.current.connect(analyserRef.current);
                } else if (!isRecording && audioRef?.current) {
                    // Audio Element (Playback)
                    // Only create source once per element to avoid errors
                    if (!sourceRef.current) {
                        try {
                            sourceRef.current = ctx.createMediaElementSource(audioRef.current);
                            sourceRef.current.connect(analyserRef.current);
                            analyserRef.current.connect(ctx.destination);
                        } catch (e) {
                            // If source already connected or similar error, ignore
                            console.warn("Audio Context setup warning:", e);
                        }
                    }
                }

                draw();
            } catch (err) {
                console.error("Error initializing visualizer:", err);
            }
        };

        const draw = () => {
            if (!canvasRef.current || !analyserRef.current) return;

            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const bufferLength = analyserRef.current.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            analyserRef.current.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Style
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
            gradient.addColorStop(0, '#6366F1'); // Indigo (Primary)
            gradient.addColorStop(1, '#F43F5E'); // Rose (Accent)
            ctx.fillStyle = gradient;

            // Draw Bars
            // We'll draw fewer bars than bins for cleaner look
            const barCount = 32;
            const step = Math.floor(bufferLength / barCount);
            const gap = 4;
            const barWidth = (canvas.width / barCount) - gap;

            for (let i = 0; i < barCount; i++) {
                // Average out the bin values for this bar to make it smoother
                let value = 0;
                for (let j = 0; j < step; j++) {
                    value += dataArray[i * step + j];
                }
                value = value / step;

                // Scale value
                const percent = value / 255;
                const height = Math.max(4, percent * canvas.height);

                // Center vertically
                const y = (canvas.height - height) / 2;
                const x = i * (barWidth + gap) + gap / 2;

                // Rounded rect
                ctx.beginPath();
                ctx.roundRect(x, y, barWidth, height, 4);
                ctx.fill();
            }

            animationRef.current = requestAnimationFrame(draw);
        };

        initAudio();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            // Don't close context here necessarily if we want to reuse, but for component unmount it's safer to cleanup
            // if (contextRef.current) contextRef.current.close();
        };
    }, [stream, audioRef, isRecording]);

    return (
        <canvas
            ref={canvasRef}
            width={320}
            height={64}
            className="w-full h-16 rounded-xl bg-black/20"
        />
    );
}

export default AudioVisualizer;
