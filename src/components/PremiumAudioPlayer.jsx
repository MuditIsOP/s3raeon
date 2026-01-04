import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import AudioVisualizer from './AudioVisualizer';

function PremiumAudioPlayer({ audioUrl }) {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

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

    // Pause audio when component unmounts
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
            }
        };
    }, []);

    // Add audioUrl change listener to reset state
    useEffect(() => {
        setIsPlaying(false);
        setCurrentTime(0);
    }, [audioUrl]);

    if (!audioUrl) return null;

    return (
        <div className="w-full">
            <audio
                ref={audioRef}
                src={audioUrl}
                crossOrigin="anonymous"
                onEnded={() => setIsPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
            />

            {/* Visualizer */}
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
        </div>
    );
}

export default PremiumAudioPlayer;
