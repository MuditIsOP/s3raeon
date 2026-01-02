import { motion, AnimatePresence } from 'framer-motion';
import { formatDate } from '../utils/timeUtils';
import { s3Client } from '../storj';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { useState, useEffect } from 'react';

const STORJ_CONFIG = {
    bucket: import.meta.env.VITE_STORJ_BUCKET || 'arshita-diary',
};

function DayViewModal({ date, entry, onClose, mode = 'full' }) {
    const [photoUrls, setPhotoUrls] = useState({});
    const [audioUrl, setAudioUrl] = useState(null);

    useEffect(() => {
        if (entry?.photos) {
            entry.photos.forEach(async (photo, index) => {
                if (photo?.url) {
                    try {
                        let url = photo.url;
                        // If it's a raw generic URL, sign it (if needed) or just use it.
                        // Assuming photo.url is the key if it doesn't start with http
                        if (!url.startsWith('http')) {
                            const command = new GetObjectCommand({
                                Bucket: STORJ_CONFIG.bucket,
                                Key: url,
                            });
                            url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
                        }
                        setPhotoUrls(prev => ({ ...prev, [index]: url }));
                    } catch (e) {
                        console.error("Failed to load photo", e);
                    }
                }
            });
        }

        if (entry?.audioUrl) {
            const loadAudio = async () => {
                try {
                    let url = entry.audioUrl;
                    // If stored as key (not full URL), sign it
                    if (!url.startsWith('http')) {
                        const command = new GetObjectCommand({
                            Bucket: STORJ_CONFIG.bucket,
                            Key: url
                        });
                        url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
                    }
                    setAudioUrl(url);
                } catch (e) {
                    console.error("Failed to load audio", e);
                }
            };
            loadAudio();
        } else {
            setAudioUrl(null);
        }
    }, [entry]);

    if (!entry) return null;

    const MOODS = {
        // String keys (Legacy)
        happy: { label: 'Happy', emoji: '😊', color: '#22c55e' },
        sad: { label: 'Sad', emoji: '😔', color: '#ef4444' },
        neutral: { label: 'Okay', emoji: '😐', color: '#eab308' },
        excited: { label: 'Excited', emoji: '🤩', color: '#a855f7' },
        tired: { label: 'Tired', emoji: '😴', color: '#64748b' },

        // Integer keys (MoodPicker 1-5)
        1: { label: 'Great', emoji: '🤩', color: '#22c55e' }, // Great -> Excited/Happy
        2: { label: 'Good', emoji: '😊', color: '#84cc16' },  // Good -> Happy
        3: { label: 'Okay', emoji: '😐', color: '#eab308' },  // Okay -> Neutral
        4: { label: 'Low', emoji: '😔', color: '#f97316' },   // Low -> Sad
        5: { label: 'Hard', emoji: '😣', color: '#ef4444' },  // Hard -> Tired/Stressed
    };

    const moodData = MOODS[entry.mood];

    return (
        <>
            <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="modal-backdrop"
            />

            <motion.div
                key="sheet"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="bottom-sheet"
                onClick={e => e.stopPropagation()}
            >
                <div className="sheet-handle" />

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gradient">{formatDate(date)}</h2>
                        {moodData && (
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xl">{moodData.emoji}</span>
                                <span className="text-xs font-medium" style={{ color: moodData.color }}>{moodData.label}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-8 pb-8">
                    {/* Photos - Hide in Voice Mode */}
                    {mode !== 'voice' && entry.photos && entry.photos.length > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                            {entry.photos.map((photo, i) => (
                                <div key={i} className="aspect-square rounded-2xl overflow-hidden bg-white/5 relative shadow-lg">
                                    {photoUrls[i] ? (
                                        <img src={photoUrls[i]} alt="Memory" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs text-muted">Loading...</div>
                                    )}
                                    {photo.starred && <div className="absolute top-2 right-2 text-yellow-400 drop-shadow-md">★</div>}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Journal - Hide in Voice Mode */}
                    {mode !== 'voice' && entry.journal && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider opacity-50 flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-current"></span>
                                Journal Entry
                            </h3>
                            <p className="text-base leading-relaxed whitespace-pre-wrap font-light" style={{ color: 'var(--text-secondary)' }}>
                                {entry.journal}
                            </p>
                        </div>
                    )}

                    {/* Voice Note Player - Always Show */}
                    {entry.audioUrl && (
                        <div className="p-5 rounded-2xl space-y-4 border border-white/5" style={{ background: 'var(--bg-elevated)' }}>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-500/10 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                </div>
                                <div>
                                    <p className="text-base font-semibold">Voice Affirmation</p>
                                    <p className="text-xs opacity-60">Recorded on {formatDate(date)}</p>
                                </div>
                            </div>

                            {audioUrl ? (
                                <div className="bg-black/20 rounded-xl p-2">
                                    <audio controls src={audioUrl} className="w-full h-8" style={{ filter: 'invert(1) hue-rotate(180deg)' }} />
                                </div>
                            ) : (
                                <div className="h-10 flex items-center justify-center bg-black/10 rounded-xl">
                                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin opacity-50"></div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Fallback for empty entries */}
                    {mode !== 'voice' && !entry.journal && (!entry.photos || entry.photos.length === 0) && !entry.audioUrl && (
                        <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>No details for this entry.</p>
                    )}

                    <div className="h-4"></div>
                </div>
            </motion.div>
        </>
    );
}

export default DayViewModal;
