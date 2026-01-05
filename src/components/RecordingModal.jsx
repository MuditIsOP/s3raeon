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
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-4 md:inset-10 bg-[var(--bg-card)] rounded-2xl z-[201] flex flex-col overflow-hidden border border-[var(--border)] shadow-2xl"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--bg-card)]">
                            <div>
                                <h3 className="font-bold text-lg text-gradient">Voice Journey</h3>
                                <p className="text-xs text-[var(--text-muted)]">Read aloud while recording</p>
                            </div>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--bg-elevated)] transition-colors">
                                <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Scrollable Body: Text Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Affirmation Card */}
                            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                                <span className="text-xs font-bold text-primary uppercase tracking-wider mb-2 block">Today's Affirmation</span>
                                <p className="text-lg font-serif italic text-[var(--text)]">"{affirmation}"</p>
                            </div>

                            {/* Journal Text */}
                            <div className="space-y-2">
                                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider block">Your Journal</span>
                                <p className="text-base text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                                    {journalText || "No journal entry written yet..."}
                                </p>
                            </div>

                            {/* Spacer for bottom scrolling */}
                            <div className="h-32"></div>
                        </div>

                        {/* Footer: Recording Controls */}
                        <div className="shrink-0 p-6 border-t border-[var(--border)] bg-[var(--bg-elevated)] relative">
                            {/* Visualizer (Background of footer?) or Compact? Let's keep it prominent but constrained */}
                            <div className="absolute inset-0 opacity-20 pointer-events-none">
                                {recordingStream && <AudioVisualizer stream={recordingStream} isRecording={true} height={100} />}
                            </div>

                            <div className="relative z-10 flex flex-col items-center gap-4">
                                <div className="text-3xl font-mono font-bold font-variant-numeric tabular-nums tracking-wider text-white drop-shadow-lg">
                                    {formatTime(recordingTime)}
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mb-2">
                                    {recordingStream
                                        ? (recordingTime < MIN_RECORDING_SECONDS ? `Keep going (${MIN_RECORDING_SECONDS - recordingTime}s left)` : 'Great! Ready to finish.')
                                        : `Minimum duration: ${formatTime(MIN_RECORDING_SECONDS)}`
                                    }
                                </p>

                                {!recordingStream ? (
                                    <button
                                        onClick={startNativeRecording}
                                        className="btn-primary w-full max-w-xs py-4 text-lg shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                                    >
                                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                                        Start Recording
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleFinish}
                                        className={`
                                            w-full max-w-xs py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all
                                            ${recordingTime < MIN_RECORDING_SECONDS
                                                ? 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-80'
                                                : 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/30'}
                                        `}
                                        disabled={recordingTime < MIN_RECORDING_SECONDS}
                                    >
                                        {recordingTime < MIN_RECORDING_SECONDS ? (
                                            <>Recording...</>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                Finish & Save
                                            </>
                                        )}
                                    </button>
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
