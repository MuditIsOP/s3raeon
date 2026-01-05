import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AudioVisualizer from './AudioVisualizer';

const MIN_RECORDING_SECONDS = 60;

function RecordingModal({ isOpen, onClose, onSave, affirmation, journalText }) {
    const [recordingTime, setRecordingTime] = useState(0);
    const [recordingStream, setRecordingStream] = useState(null);
    const [failedPermission, setFailedPermission] = useState(false);
    const [uploading, setUploading] = useState(false);

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
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200]"
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        // Consistent height management for mobile vs desktop
                        className="fixed inset-4 bottom-8 md:inset-auto md:w-[90vw] md:max-w-xl md:h-[80vh] md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 bg-[var(--bg-card)] rounded-2xl z-[201] flex flex-col overflow-hidden border border-[var(--border)] shadow-2xl"
                    >
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--bg-card)]">
                            <div>
                                <h3 className="font-bold text-base md:text-lg text-gradient">Voice Affirmation</h3>
                                <p className="text-[10px] md:text-xs text-[var(--text-muted)]">Read clearly & confidentally</p>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--bg-elevated)] transition-colors">
                                <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Main Content: Auto-scaling Affirmation */}
                        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-primary/5 min-h-0 overflow-y-auto">
                            <div className="w-full max-w-md mx-auto">
                                <span className="text-[10px] md:text-xs font-bold text-primary uppercase tracking-wider mb-2 md:mb-4 block opacity-70">
                                    Today's Affirmation
                                </span>
                                {/* User requested "Spotify/Apple Music lyric" style scaling */}
                                <p
                                    className="font-serif italic text-[var(--text)] leading-relaxed px-2"
                                    style={{
                                        fontSize: 'clamp(1.25rem, 5vw, 2.25rem)', // Dynamic sizing: min 1.25rem, ideal 5% of viewport width, max 2.25rem
                                        lineHeight: '1.4'
                                    }}
                                >
                                    "{affirmation}"
                                </p>
                            </div>
                        </div>

                        {/* Footer: Recording Controls - Always Visible */}
                        <div className="shrink-0 p-4 md:p-6 border-t border-[var(--border)] bg-[var(--bg-elevated)] relative">
                            {/* Visualizer Background */}
                            <div className="absolute inset-0 opacity-20 pointer-events-none">
                                {recordingStream && <AudioVisualizer stream={recordingStream} isRecording={true} height={80} />}
                            </div>

                            <div className="relative z-10 flex flex-col items-center gap-3 md:gap-4">
                                <div className="text-2xl md:text-3xl font-mono font-bold font-variant-numeric tabular-nums tracking-wider text-white drop-shadow-lg">
                                    {formatTime(recordingTime)}
                                </div>
                                <p className="text-[10px] md:text-xs text-[var(--text-muted)] mb-1">
                                    {recordingStream
                                        ? (recordingTime < MIN_RECORDING_SECONDS ? `Keep going (${MIN_RECORDING_SECONDS - recordingTime}s left)` : 'Great! Ready to finish.')
                                        : `Minimum duration: ${formatTime(MIN_RECORDING_SECONDS)}`
                                    }
                                </p>

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
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}

export default RecordingModal;
