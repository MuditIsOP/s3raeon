import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AudioVisualizer from './AudioVisualizer';

const MIN_RECORDING_SECONDS = 60;

function RecordingModal({ isOpen, onClose, onSave, affirmation }) {
    const [recordingTime, setRecordingTime] = useState(0);
    const [recordingStream, setRecordingStream] = useState(null);
    const [failedPermission, setFailedPermission] = useState(false);

    // Auto-scaling text logic
    const textRef = useRef(null);
    const containerRef = useRef(null);

    useLayoutEffect(() => {
        const container = containerRef.current;
        const text = textRef.current;
        if (!container || !text) return;

        const adjustFontSize = () => {
            // Binary Search for the perfect fit
            // Range: 12px (min readable) to 60px (nice and big)
            let min = 12;
            let max = 60;
            let optimal = 12;

            // Loop to find largest size where container doesn't overflow
            while (min <= max) {
                const mid = Math.floor((min + max) / 2);
                text.style.fontSize = `${mid}px`;
                text.style.lineHeight = '1.4';

                // Critical Fix: Check if the CONTAINER overflows, not just if text fits container height.
                // The container has other elements (Header span), so checking text.height <= container.height is wrong.
                // container.scrollHeight > container.clientHeight means something is overflowing.

                // We add a safety buffer (32px) to ensure it doesn't touch the edges/header
                const safetyBuffer = 32;
                const hasOverflow =
                    container.scrollHeight > (container.clientHeight - safetyBuffer) ||
                    container.scrollWidth > container.clientWidth;

                if (!hasOverflow) {
                    optimal = mid;
                    min = mid + 1; // Try larger
                } else {
                    max = mid - 1; // Too big
                }
            }

            // Apply optimal size
            text.style.fontSize = `${optimal}px`;
        };

        const observer = new ResizeObserver(() => {
            // Debounce slightly or just run? ResizeObserver is efficient.
            // RequestAnimationFrame ensures we don't cause loop errors.
            requestAnimationFrame(adjustFontSize);
        });

        observer.observe(container);
        adjustFontSize(); // Initial run

        return () => observer.disconnect();
    }, [affirmation, isOpen]);


    // Refs for Recorder
    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);

    // Start recording automatically when opened (or maybe require manual start? User said "open new dialog box with recording controls")
    // Use manual start for safety/prep, or auto-start for convenience. Given the user context "scrolling... to read", manual start gives them time to prep.
    // BUT, usually "open recorder" implies readiness. Let's stick to manual start in the UI, but we can init the stream.
    // Actually, let's auto-init microphone but wait for user to tap "Start".
    // EDIT: User said "scrolling up and down... her phone freezes". 
    // Let's keep it simple: Modal opens -> User sees text -> Taps Record -> Records.

    useEffect(() => {
        if (isOpen) {
            // Reset state
            setRecordingTime(0);
            setRecordingStream(null);
            setFailedPermission(false);
            chunksRef.current = [];
        } else {
            // Cleanup on close
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

            mediaRecorderRef.current.onstop = () => {
                // Determine completion
            };

            mediaRecorderRef.current.start();

            // Start Timer
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
        // Stop and Save
        stopNativeRecording();

        // Need a small delay to ensure 'onstop' processing (blobs gathered)?
        // Actually, since we control the flow, we can just process chunksRef directly after a brief moment or assume sync is fine if we wait for event.
        // Better: wait for onstop event? 
        // Simplest: just wait 200ms
        setTimeout(() => {
            const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
            onSave(blob, recordingTime); // Pass blob back to parent
        }, 200);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full h-[85vh] md:h-auto md:max-h-[85vh] md:max-w-xl bg-[var(--bg-card)] rounded-2xl flex flex-col overflow-hidden border border-[var(--border)] shadow-2xl relative"
                    >
                        {/* Header */}
                        <div className="relative z-20 px-4 py-3 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--bg-card)] shadow-sm">
                            <div>
                                <h3 className="font-bold text-base md:text-lg text-gradient">Voice Affirmation</h3>
                                <p className="text-[10px] md:text-xs text-[var(--text-muted)]">Read clearly & confidentally</p>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--bg-elevated)] transition-colors">
                                <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Main Content: Auto-scaling Affirmation */}
                        <div ref={containerRef} className="flex-1 flex flex-col justify-center items-center p-6 text-center bg-primary/5 min-h-0 overflow-hidden w-full">
                            <div className="w-full max-w-lg mx-auto flex flex-col justify-center">
                                <span className="text-[10px] md:text-xs font-bold text-primary uppercase tracking-wider mb-2 md:mb-4 block opacity-70 shrink-0">
                                    Today's Affirmation
                                </span>
                                <p
                                    ref={textRef}
                                    className="font-serif italic text-[var(--text)] px-2 w-full"
                                    style={{
                                        lineHeight: '1.4',
                                        whiteSpace: 'pre-wrap'
                                    }}
                                >
                                    "{affirmation}"
                                </p>
                            </div>
                        </div>

                        {/* Footer: Recording Controls - Always Visible */}
                        <div className="shrink-0 z-20 p-4 md:p-6 border-t border-[var(--border)] bg-[var(--bg-elevated)] relative flex flex-col items-center">

                            <div className="relative z-10 flex flex-col items-center gap-3 w-full max-w-md">
                                {/* Timer */}
                                <div className="text-2xl md:text-3xl font-mono font-bold font-variant-numeric tabular-nums tracking-wider text-white drop-shadow-lg">
                                    {formatTime(recordingTime)}
                                </div>

                                {/* Centered Visualizer (Full Width) */}
                                <div className="h-16 w-full flex items-center justify-center my-1 px-4">
                                    {recordingStream ? (
                                        <div className="w-full">
                                            <AudioVisualizer stream={recordingStream} isRecording={true} height={64} />
                                        </div>
                                    ) : (
                                        <div className="h-1 w-24 bg-[var(--border)] rounded-full opacity-50" />
                                    )}
                                </div>

                                {!recordingStream ? (
                                    <button
                                        onClick={startNativeRecording}
                                        className="btn-primary w-full max-w-xs py-3 md:py-4 text-base md:text-lg shadow-lg shadow-primary/20 flex items-center justify-center gap-2 touch-manipulation"
                                    >
                                        <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-500 animate-pulse" />
                                        Start Recording
                                    </button>
                                ) : (
                                    <div className="flex gap-3 w-full max-w-xs">
                                        <button
                                            onClick={() => {
                                                stopNativeRecording();
                                                setRecordingTime(0);
                                            }}
                                            className="flex-1 py-3 md:py-4 rounded-xl font-medium text-xs md:text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 touch-manipulation"
                                        >
                                            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            Stop
                                        </button>

                                        <button
                                            onClick={handleFinish}
                                            disabled={recordingTime < MIN_RECORDING_SECONDS}
                                            className={`
                                                flex-[2] py-3 md:py-4 rounded-xl font-bold text-sm md:text-lg shadow-lg flex items-center justify-center gap-2 transition-all touch-manipulation
                                                ${recordingTime < MIN_RECORDING_SECONDS
                                                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed border border-gray-600'
                                                    : 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/30'}
                                            `}
                                        >
                                            {recordingTime < MIN_RECORDING_SECONDS ? (
                                                <span className="opacity-50">Locked...</span>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                    Finish
                                                </>
                                            )}
                                        </button>
                                    </div>
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
