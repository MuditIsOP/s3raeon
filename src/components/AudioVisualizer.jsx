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
                    analyserRef.current.fftSize = 256;
                    analyserRef.current.smoothingTimeConstant = 0.5;
                }

                if (isRecording && stream) {
                    if (sourceRef.current) sourceRef.current.disconnect();
                    sourceRef.current = ctx.createMediaStreamSource(stream);
                    sourceRef.current.connect(analyserRef.current);
                } else if (!isRecording && audioRef?.current) {
                    if (!sourceRef.current) {
                        try {
                            sourceRef.current = ctx.createMediaElementSource(audioRef.current);
                            sourceRef.current.connect(analyserRef.current);
                            analyserRef.current.connect(ctx.destination);
                        } catch (e) {
                            console.warn("Audio source already connected:", e);
                        }
                    }
                }

                draw();
            } catch (err) {
                console.error("Visualizer init error:", err);
            }
        };

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

            // Only add new data when audio is playing/recording (every 4th frame)
            if (audioIsActive) {
                frameCountRef.current++;
                if (frameCountRef.current >= 4) {
                    frameCountRef.current = 0;
                    historyRef.current.push(currentAmplitude);
                    if (historyRef.current.length > maxHistoryLength) {
                        historyRef.current.shift();
                    }
                }
            }

            // Clear canvas
            ctx.clearRect(0, 0, width, height);

            // Draw scrolling waveform
            const barCount = historyRef.current.length;
            const gap = 1;
            const barWidth = Math.max(1, (width / maxHistoryLength) - gap);

            // Gradient: Purple to Pink
            const gradient = ctx.createLinearGradient(0, 0, width, 0);
            gradient.addColorStop(0, '#8B5CF6');
            gradient.addColorStop(1, '#EC4899');
            ctx.fillStyle = gradient;

            for (let i = 0; i < barCount; i++) {
                const amplitude = historyRef.current[i];

                // Boost amplitude: sqrt for sensitivity + 2x multiplier
                const boostedAmplitude = Math.sqrt(amplitude) * 2;

                const minHeight = 4;
                const barHeight = Math.max(minHeight, Math.min(boostedAmplitude * height * 0.9, height * 0.95));

                const x = i * (barWidth + gap);
                const y = centerY - barHeight / 2;

                ctx.beginPath();
                ctx.roundRect(x, y, barWidth, barHeight, 1);
                ctx.fill();
            }

            animationRef.current = requestAnimationFrame(draw);
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
