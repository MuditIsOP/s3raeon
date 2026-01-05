import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDiary } from '../App';
import { getTodayIST, getDayOfMonth } from '../utils/timeUtils';
import { uploadAudio } from '../storj';
import affirmations from '../data/affirmations.json';
import AudioVisualizer from './AudioVisualizer';
import RecordingModal from './RecordingModal';

const MIN_RECORDING_SECONDS = 60;

function MorningSection({ todayEntry, isUnlocked }) {
    const { saveEntry } = useDiary();
    const today = getTodayIST();
    const dayOfMonth = getDayOfMonth();
    const affirmation = affirmations[dayOfMonth] || affirmations['1'];

    // Playback State
    const [audioUrl, setAudioUrl] = useState(todayEntry?.audioUrl || null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [uploadingAudio, setUploadingAudio] = useState(false);

    // Recording Modal State
    const [showRecordingModal, setShowRecordingModal] = useState(false);

    const audioRef = useRef(null);

    useEffect(() => { if (todayEntry?.audioUrl) setAudioUrl(todayEntry.audioUrl); }, [todayEntry?.audioUrl]);

    const handleUploadAudio = async (blob, durationSecs) => {
        try {
            setUploadingAudio(true);
            const downloadUrl = await uploadAudio(today, blob);
            setAudioUrl(downloadUrl);
            // Save with duration for stats tracking
            await saveEntry(today, { audioUrl: downloadUrl, audioDuration: durationSecs, morningCompleted: true, affirmation });
        } catch (error) {
            console.error('Error uploading:', error);
            alert('Upload failed');
        } finally {
            setUploadingAudio(false);
        }
    };

    const handleModalSave = (blob, duration) => {
        setShowRecordingModal(false);
        handleUploadAudio(blob, duration);
    };

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) audioRef.current.pause();
            else audioRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    const seekForward = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 10, duration);
        }
    };

    const seekBackward = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 10, 0);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleSeek = (e) => {
        if (audioRef.current && duration) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = x / rect.width;
            audioRef.current.currentTime = percentage * duration;
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const [showRetakeModal, setShowRetakeModal] = useState(false);
    const [deleteInput, setDeleteInput] = useState('');

    const confirmRetake = () => {
        if (deleteInput.toLowerCase() === 'delete') {
            setAudioUrl(null);
            setIsPlaying(false);
            setShowRetakeModal(false);
            setDeleteInput('');
        }
    };

    return (
        <section className="card relative overflow-hidden">
            <div className="card-header">
                <h2 className="card-title">Voice Affirmation</h2>
                {audioUrl && <div className="completed-badge"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div>}
            </div>

            <AnimatePresence mode="wait">
                {audioUrl ? (
                    <motion.div key="playback" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <audio
                            ref={audioRef}
                            src={audioUrl}
                            crossOrigin="anonymous"
                            onEnded={() => setIsPlaying(false)}
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                        />

                        {/* Visualizer for Playback */}
                        <div className="mb-4">
                            <AudioVisualizer audioRef={audioRef} audioUrl={audioUrl} isRecording={false} isPlaying={isPlaying} />
                        </div>

                        {/* Progress bar */}
                        <div
                            className="h-1.5 rounded-full mb-3 cursor-pointer"
                            style={{ background: 'var(--bg-elevated)' }}
                            onClick={handleSeek}
                        >
                            <div
                                className="h-full rounded-full transition-all"
                                style={{
                                    width: duration ? `${(currentTime / duration) * 100}%` : '0%',
                                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)'
                                }}
                            />
                        </div>

                        {/* Time display */}
                        <div className="flex justify-between text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-center gap-4">
                            {/* Backward 10s */}
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={seekBackward}
                                className="w-10 h-10 flex items-center justify-center rounded-full"
                                style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                                </svg>
                                <span className="absolute text-[8px] font-bold" style={{ marginTop: '1px' }}>10</span>
                            </motion.button>

                            {/* Play/Pause */}
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={togglePlay}
                                className="w-14 h-14 flex items-center justify-center rounded-full text-white"
                                style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)' }}
                            >
                                {isPlaying ? (
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                                ) : (
                                    <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                )}
                            </motion.button>

                            {/* Forward 10s */}
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={seekForward}
                                className="w-10 h-10 flex items-center justify-center rounded-full"
                                style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                                </svg>
                                <span className="absolute text-[8px] font-bold" style={{ marginTop: '1px' }}>10</span>
                            </motion.button>
                        </div>

                        {/* Retake Option */}
                        <div className="text-center mt-6">
                            {isUnlocked ? (
                                <button
                                    onClick={() => setShowRetakeModal(true)}
                                    className="text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors flex items-center justify-center gap-1 mx-auto"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    Retake Recording
                                </button>
                            ) : (
                                <button disabled className="text-xs text-[var(--text-muted)] flex items-center justify-center gap-1 mx-auto opacity-50 cursor-not-allowed">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                    Voice Logged (Locked)
                                </button>
                            )}
                        </div>
                    </motion.div>
                ) : !isUnlocked ? (
                    <motion.div key="locked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-4">
                        <p className="text-sm italic mb-4 px-2" style={{ color: 'var(--text-secondary)', lineHeight: '1.5' }}>"{affirmation}"</p>
                        <div className="h-16 w-full rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)] text-sm mb-4 opacity-50">
                            Visualizer locked
                        </div>
                        <button disabled className="btn-secondary w-full opacity-75 cursor-not-allowed">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            Locked until 5:00 AM
                        </button>
                    </motion.div>
                ) : (
                    <motion.div key="start" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-8">
                        <p className="text-sm italic mb-6 px-4 text-[var(--text-secondary)]">"{affirmation}"</p>

                        <div className="mb-6 flex justify-center">
                            <div className="w-20 h-20 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center relative">
                                <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '3s' }}></div>
                                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowRecordingModal(true)}
                            className="btn-primary w-full max-w-xs mx-auto py-3 text-base shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18l9-9m-9 9l-9-9m9 9v-16" /></svg>
                            Start Recording Journey
                        </button>
                        <p className="text-xs mt-3 text-[var(--text-muted)]">Read the journal & affirmation aloud</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Recording Modal */}
            <RecordingModal
                isOpen={showRecordingModal}
                onClose={() => setShowRecordingModal(false)}
                onSave={handleModalSave}
                affirmation={affirmation}
                journalText={todayEntry?.journal}
            />

            {/* Retake Confirmation Sheet */}
            <AnimatePresence>
                {showRetakeModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="modal-backdrop z-40"
                            onClick={() => setShowRetakeModal(false)}
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="bottom-sheet"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="sheet-handle" />
                            <h3 className="font-semibold text-lg mb-2" style={{ color: 'var(--text)' }}>Delete Recording?</h3>
                            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                                This will permanently delete your existing recording to let you start over.
                            </p>

                            <div className="mb-6">
                                <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                                    Type <span className="text-red-400 font-mono bg-red-500/10 px-1.5 py-0.5 rounded">delete</span> to confirm:
                                </label>
                                <input
                                    type="text"
                                    value={deleteInput}
                                    onChange={(e) => setDeleteInput(e.target.value)}
                                    className="input-field text-center font-mono tracking-wider"
                                    placeholder="type delete"
                                    autoFocus
                                    autoComplete="off"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowRetakeModal(false)}
                                    className="flex-1 btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmRetake}
                                    disabled={deleteInput.toLowerCase() !== 'delete'}
                                    className="flex-1 py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center gap-2"
                                    style={{
                                        background: deleteInput.toLowerCase() === 'delete'
                                            ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
                                            : 'var(--bg-elevated)',
                                        color: deleteInput.toLowerCase() === 'delete' ? 'white' : 'var(--text-muted)'
                                    }}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    Delete & Retake
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </section>
    );
}

export default MorningSection;
