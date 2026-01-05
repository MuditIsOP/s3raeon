import { useEffect, useRef } from 'react';

function AudioVisualizer({ stream, audioRef, isRecording, isPlaying }) {
    const canvasRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const sourceRef = useRef(null);
    const animationRef = useRef(null);

    useEffect(() => {
        // Cleaning up previous context if stream changes significantly? 
        // Actually the main init handles it.
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, []);

    useEffect(() => {
        if (!stream && !audioRef?.current) return;

        const draw = () => {
            if (!canvasRef.current || !analyserRef.current) return;

            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();

            // Handle resize
            if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;
                ctx.scale(dpr, dpr);
            }

            const width = rect.width;
            const height = rect.height;

            const bufferLength = analyserRef.current.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyserRef.current.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, width, height);

            // Visualizer Reference: Real-time FFT
            // We want to display ~64 bars. Buffer is usually 256 or 512.
            // We'll sample appropriately.
            let barCount = 64;
            // If width is small, reduce bar count
            if (width < 300) barCount = 32;

            const barWidth = (width / barCount) - 2; // 2px gap
            const step = Math.floor(bufferLength / barCount);

            // Gradient: Indigo -> Pink -> Rose
            const gradient = ctx.createLinearGradient(0, 0, width, 0);
            gradient.addColorStop(0, '#6366F1');
            gradient.addColorStop(0.5, '#EC4899');
            gradient.addColorStop(1, '#F43F5E');
            ctx.fillStyle = gradient;

            // Glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'rgba(236, 72, 153, 0.4)';

            for (let i = 0; i < barCount; i++) {
                // Get average of the 'step' bin range for smoother values
                let sum = 0;
                for (let j = 0; j < step; j++) {
                    sum += dataArray[i * step + j];
                }
                const value = sum / step;

                // Scale height: value is 0-255
                // Boost quiet sounds slightly
                const percent = value / 255;
                const barHeight = Math.max(4, height * percent * 1.2);

                const x = i * (barWidth + 2);
                const y = (height - barHeight) / 2; // Vertically center the bars

                ctx.beginPath();
                ctx.roundRect(x, y, Math.max(2, barWidth), barHeight, 4);
                ctx.fill();
            }

            animationRef.current = requestAnimationFrame(draw);
        };

        const initAudio = async () => {
            try {
                if (!audioContextRef.current) {
                    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
                }

                const ctx = audioContextRef.current;
                if (ctx.state === 'suspended') await ctx.resume();

                if (!analyserRef.current) {
                    analyserRef.current = ctx.createAnalyser();
                    analyserRef.current.fftSize = 256; // 128 bins
                    analyserRef.current.smoothingTimeConstant = 0.5; // Responsive but not jittery
                }

                if (isRecording && stream) {
                    if (sourceRef.current) {
                        try { sourceRef.current.disconnect(); } catch (e) { }
                    }
                    sourceRef.current = ctx.createMediaStreamSource(stream);
                    sourceRef.current.connect(analyserRef.current);
                } else if (!isRecording && audioRef?.current) {
                    if (!sourceRef.current) {
                        // Avoid re-connecting if already connected (Chrome limitation)
                        // Actually, createMediaElementSource can only be called once per element.
                        // Ideally checking if source already exists for this element would be good, 
                        // but here we just try/catch safely or assume clean init.
                        try {
                            sourceRef.current = ctx.createMediaElementSource(audioRef.current);
                            sourceRef.current.connect(analyserRef.current);
                            analyserRef.current.connect(ctx.destination);
                        } catch (e) {
                            // Already connected
                        }
                    }
                }

                draw();
            } catch (err) {
                console.error("Audio init error:", err);
            }
        };

        initAudio();

    }, [stream, audioRef, isRecording, isPlaying]);

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-full rounded-xl"
        />
    );
}

export default AudioVisualizer;
