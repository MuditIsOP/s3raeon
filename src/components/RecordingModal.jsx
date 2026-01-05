import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AudioVisualizer from './AudioVisualizer';

const MIN_RECORDING_SECONDS = 60;

function RecordingModal({ isOpen, onClose, onSave, affirmation }) {
    const [recordingTime, setRecordingTime] = useState(0);
    const [recordingStream, setRecordingStream] = useState(null);
    const [failedPermission, setFailedPermission] = useState(false);

    // Refs for text scaling
    const textRef = useRef(null);
    const textZoneRef = useRef(null);

    // Refs for Recorder
    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);

    // ============================================
    // TEXT SCALING LOGIC (offsetHeight approach)
    // ============================================
    useLayoutEffect(() => {
        const textZone = textZoneRef.current;
        const textEl = textRef.current;
        if (!textZone || !textEl || !isOpen) return;

        const adjustFontSize = () => {
            // Get available height (the text zone's visible area)
            const availableHeight = textZone.clientHeight;
            const availableWidth = textZone.clientWidth;

            // Binary search for optimal font size
            let min = 10;
            let max = 80;
            let optimal = min;

            while (min <= max) {
                const mid = Math.floor((min + max) / 2);
                textEl.style.fontSize = `${mid}px`;
                textEl.style.lineHeight = '1.35';

                // offsetHeight gives true rendered height regardless of parent's overflow
                const textHeight = textEl.offsetHeight;
                const textWidth = textEl.offsetWidth;

                // Check if it fits (with small buffer for safety)
                const fits = textHeight <= availableHeight - 16 && textWidth <= availableWidth - 16;

                if (fits) {
                    optimal = mid;
                    min = mid + 1;
                } else {
                    max = mid - 1;
                }
            }

            // Apply the optimal font size
            textEl.style.fontSize = `${optimal}px`;
        };

        // Delay to wait for modal animation to complete
        const timerId = setTimeout(adjustFontSize, 250);

        // Also adjust on window resize
        const resizeHandler = () => adjustFontSize();
        window.addEventListener('resize', resizeHandler);

        return () => {
            clearTimeout(timerId);
            window.removeEventListener('resize', resizeHandler);
        };
    }, [affirmation, isOpen]);

    // ============================================
    // RECORDING LOGIC
    // ============================================
    useEffect(() => {
        if (isOpen) {
            setRecordingTime(0);
            setRecordingStream(null);
            setFailedPermission(false);
            chunksRef.current = [];
        } else {
            stopNativeRecording();
        }
    }, [isOpen]);

    const startNativeRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            setRecordingStream(stream);

            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorderRef.current.onstop = () => { };

            mediaRecorderRef.current.start();

            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(t => t + 1);
            }, 1000);

            setFailedPermission(false);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            setFailedPermission(true);
        }
    };

    const stopNativeRecording = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            setRecordingStream(null);
        }
    };

    const handleFinish = () => {
        stopNativeRecording();
        setTimeout(() => {
            const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
            onSave(blob, recordingTime);
        }, 200);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (typeof document === 'undefined') return null;

    // ============================================
    // RENDER
    // ============================================
    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            display: 'grid',
                            gridTemplateRows: 'auto 1fr auto',
                            height: '90vh',
                            maxHeight: '700px',
                        }}
                        className="w-full max-w-lg bg-[var(--bg-card)] rounded-2xl overflow-hidden border border-[var(--border)] shadow-2xl"
                    >
                        {/* ===== ROW 1: HEADER (fixed) ===== */}
                        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-card)]">
                            <div>
                                <h3 className="font-bold text-base md:text-lg text-gradient">Voice Affirmation</h3>
                                <p className="text-[10px] md:text-xs text-[var(--text-muted)]">Read clearly & confidently</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-[var(--bg-elevated)] transition-colors"
                            >
                                <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* ===== ROW 2: TEXT ZONE (flexible, takes remaining space) ===== */}
                        <div
                            ref={textZoneRef}
                            className="flex items-center justify-center p-4 md:p-6 bg-gradient-to-b from-primary/5 to-transparent overflow-hidden"
                        >
                            <p
                                ref={textRef}
                                className="font-serif italic text-[var(--text)] text-center px-2 w-full"
                                style={{ lineHeight: '1.35' }}
                            >
                                "{affirmation}"
                            </p>
                        </div>

                        {/* ===== ROW 3: CONTROLS (fixed) ===== */}
                        <div className="p-4 md:p-5 border-t border-[var(--border)] bg-[var(--bg-elevated)]">
                            <div className="flex flex-col items-center gap-3 max-w-sm mx-auto">
                                {/* Timer */}
                                <div className="text-2xl md:text-3xl font-mono font-bold tabular-nums tracking-wider text-white">
                                    {formatTime(recordingTime)}
                                </div>

                                {/* Visualizer */}
                                <div className="h-12 w-full flex items-center justify-center">
                                    {recordingStream ? (
                                        <div className="w-full max-w-xs">
                                            <AudioVisualizer stream={recordingStream} isRecording={true} height={48} />
                                        </div>
                                    ) : (
                                        <div className="h-1 w-20 bg-[var(--border)] rounded-full opacity-40" />
                                    )}
                                </div>

                                {/* Buttons */}
                                {!recordingStream ? (
                                    <button
                                        onClick={startNativeRecording}
                                        className="btn-primary w-full max-w-xs py-3 text-base shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                                    >
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                                        Start Recording
                                    </button>
                                ) : (
                                    <div className="flex gap-3 w-full max-w-xs">
                                        <button
                                            onClick={() => {
                                                stopNativeRecording();
                                                setRecordingTime(0);
                                            }}
                                            className="flex-1 py-3 rounded-xl font-medium text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            Stop
                                        </button>

                                        <button
                                            onClick={handleFinish}
                                            disabled={recordingTime < MIN_RECORDING_SECONDS}
                                            className={`
                                                flex-[2] py-3 rounded-xl font-bold text-base shadow-lg flex items-center justify-center gap-2 transition-all
                                                ${recordingTime < MIN_RECORDING_SECONDS
                                                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed border border-gray-600'
                                                    : 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/30'}
                                            `}
                                        >
                                            {recordingTime < MIN_RECORDING_SECONDS ? (
                                                <span className="opacity-50">Locked...</span>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Finish
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}

                                {failedPermission && (
                                    <p className="text-xs text-red-400 text-center">
                                        Microphone access denied. Please enable it in your browser settings.
                                    </p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}

export default RecordingModal;
