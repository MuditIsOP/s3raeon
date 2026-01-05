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

            // Visualizer Logic: Mirrored, Voice-Focused
            // Voice is mostly low-mid freq. We ignore the high 50% of bins to fill the view with activity.
            const voiceBinCount = Math.floor(bufferLength * 0.5);

            // We want ~32 bars on EACH side (64 total)
            const sideBarCount = 32;
            const totalWidth = width;
            const centerX = totalWidth / 2;

            const barWidth = (totalWidth / 2 / sideBarCount) - 2;
            const step = Math.floor(voiceBinCount / sideBarCount);

            // Gradient: Indigo -> Pink -> Rose
            const gradient = ctx.createLinearGradient(0, 0, width, 0);
            gradient.addColorStop(0, '#6366F1');
            gradient.addColorStop(0.5, '#F43F5E'); // Center hot pink 
            gradient.addColorStop(1, '#6366F1');
            ctx.fillStyle = gradient;

            // Glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'rgba(236, 72, 153, 0.4)';

            for (let i = 0; i < sideBarCount; i++) {
                // Average amplitude for this bin group
                let sum = 0;
                for (let j = 0; j < step; j++) {
                    sum += dataArray[i * step + j];
                }
                const value = sum / step;

                // Scale height with boost for quiet sounds
                const percent = value / 255;
                const barHeight = Math.max(4, height * percent * 1.5);

                // Draw Mirrored Bars (Left and Right from Center)
                const xRight = centerX + i * (barWidth + 2);
                const xLeft = centerX - (i + 1) * (barWidth + 2);
                const y = (height - barHeight) / 2;

                ctx.beginPath();

                // Right Bar
                ctx.roundRect(xRight, y, Math.max(2, barWidth), barHeight, 4);

                // Left Bar
                ctx.roundRect(xLeft, y, Math.max(2, barWidth), barHeight, 4);

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
