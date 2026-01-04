import { useEffect, useRef } from 'react';

function AudioVisualizer({ stream, audioRef, isRecording, isPlaying }) {
    const canvasRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const sourceRef = useRef(null);
    const animationRef = useRef(null);
    const historyRef = useRef([]);
    const frameCountRef = useRef(0);
    const maxHistoryLength = 200;

    useEffect(() => {
        historyRef.current = new Array(maxHistoryLength).fill(0);
    }, []);

    // Clear history when seeking
    useEffect(() => {
        if (!audioRef?.current) return;

        const handleSeeked = () => {
            // Reset history to flat line on seek
            historyRef.current = new Array(maxHistoryLength).fill(0);
        };

        const audio = audioRef.current;
        audio.addEventListener('seeked', handleSeeked);

        return () => {
            audio.removeEventListener('seeked', handleSeeked);
        };
    }, [audioRef]);

    useEffect(() => {
        if (!stream && !audioRef?.current) return;

        const draw = () => {
            if (!canvasRef.current || !analyserRef.current) return;

            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const dpr = window.devicePixelRatio || 1;

            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);

            const width = rect.width;
            const height = rect.height;
            const centerY = height / 2;

            // Check if audio is actually playing
            const audioIsActive = isRecording || (isPlaying && !audioRef?.current?.paused);

            // Get current frequency data
            const bufferLength = analyserRef.current.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyserRef.current.getByteFrequencyData(dataArray);

            // Calculate current average amplitude
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const currentAmplitude = sum / bufferLength / 255;

            // Only add new data when audio is playing/recording
            if (audioIsActive) {
                // Smooth the amplitude input (Low-pass filter)
                // This removes jagged spikes and makes the wave feel "liquid"
                const smoothFactor = 0.3; // Lower = smoother, Higher = more responsive
                const lastVal = historyRef.current.length > 0 ? historyRef.current[historyRef.current.length - 1] : 0;
                const smoothedAmp = (currentAmplitude * smoothFactor) + (lastVal * (1 - smoothFactor));

                historyRef.current.push(smoothedAmp);
                if (historyRef.current.length > maxHistoryLength) {
                    historyRef.current.shift();
                }
            }

            // Clear canvas
            ctx.clearRect(0, 0, width, height);

            // Draw scrolling waveform
            const barCount = historyRef.current.length;
            const gap = 2; // Increased gap for cleaner look
            const barWidth = Math.max(1, (width / maxHistoryLength) - gap);

            // Premium Gradient: Indigo to Rose
            const gradient = ctx.createLinearGradient(0, 0, width, 0);
            gradient.addColorStop(0, '#6366F1'); // Indigo-500
            gradient.addColorStop(0.5, '#EC4899'); // Pink-500
            gradient.addColorStop(1, '#F43F5E'); // Rose-500

            ctx.fillStyle = gradient;

            // Add Neon Glow
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(236, 72, 153, 0.5)'; // Pink glow

            for (let i = 0; i < barCount; i++) {
                const amplitude = historyRef.current[i];

                // Boost amplitude with a sigmoid-like curve for better dynamic range
                // Small sounds get boosted, loud sounds get compressed slightly
                const boostedAmplitude = amplitude > 0 ? Math.pow(amplitude, 0.8) * 2.5 : 0.05;

                const minHeight = 4;
                const barHeight = Math.max(minHeight, Math.min(boostedAmplitude * height * 0.8, height * 0.9));

                const x = i * (barWidth + gap);
                const y = centerY - barHeight / 2;

                ctx.beginPath();
                // Ensure barWidth is at least 1px
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

                if (ctx.state === 'suspended') {
                    await ctx.resume();
                }

                if (!analyserRef.current) {
                    analyserRef.current = ctx.createAnalyser();
                    analyserRef.current.fftSize = 512; // Higher resolution for better averaging
                    analyserRef.current.smoothingTimeConstant = 0.8; // Hardware smoothing
                }

                if (isRecording && stream) {
                    try {
                        if (sourceRef.current) {
                            try { sourceRef.current.disconnect(); } catch (e) { }
                        }
                        sourceRef.current = ctx.createMediaStreamSource(stream);
                        sourceRef.current.connect(analyserRef.current);
                    } catch (e) { console.warn("Stream connect error:", e); }
                } else if (!isRecording && audioRef?.current) {
                    if (!sourceRef.current) {
                        try {
                            sourceRef.current = ctx.createMediaElementSource(audioRef.current);
                            sourceRef.current.connect(analyserRef.current);
                            analyserRef.current.connect(ctx.destination);
                        } catch (e) {
                            console.warn("Audio element connect warning:", e);
                        }
                    }
                }

                draw();
            } catch (err) {
                console.error("Visualizer init error:", err);
            }
        };

        initAudio();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [stream, audioRef, isRecording, isPlaying]);

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-32 rounded-xl"
            style={{ background: 'rgba(0, 0, 0, 0.2)' }}
        />
    );
}

export default AudioVisualizer;
