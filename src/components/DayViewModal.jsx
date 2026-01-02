import { motion, AnimatePresence } from 'framer-motion';
import { formatDate } from '../utils/timeUtils';
import { s3Client } from '../storj';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { useState, useEffect } from 'react';

const STORJ_CONFIG = {
    bucket: import.meta.env.VITE_STORJ_BUCKET || 'arshita-diary',
};

function DayViewModal({ date, entry, onClose }) {
    const [photoUrls, setPhotoUrls] = useState({});

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
    }, [entry]);

    if (!entry) return null;

    const MOODS = {
        happy: { label: 'Happy', emoji: '😊', color: '#22c55e' },
        sad: { label: 'Sad', emoji: '😔', color: '#ef4444' },
        neutral: { label: 'Okay', emoji: '😐', color: '#eab308' },
        excited: { label: 'Excited', emoji: '🤩', color: '#a855f7' },
        tired: { label: 'Tired', emoji: '😴', color: '#64748b' },
    };

    const moodData = MOODS[entry.mood] || MOODS.neutral;

    return (
        <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="card w-full max-w-lg max-h-[85vh] overflow-y-auto relative z-10 p-0"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 p-4 border-b border-white/10 flex items-center justify-between backdrop-blur-xl bg-[#1c1c1e]/80 z-20">
                    <div>
                        <h2 className="text-lg font-bold text-gradient">{formatDate(date)}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xl">{moodData.emoji}</span>
                            <span className="text-xs font-medium" style={{ color: moodData.color }}>{moodData.label}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn-icon">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-5 space-y-6">
                    {/* Photos */}
                    {entry.photos && entry.photos.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                            {entry.photos.map((photo, i) => (
                                <div key={i} className="aspect-square rounded-xl overflow-hidden bg-white/5 relative">
                                    {photoUrls[i] ? (
                                        <img src={photoUrls[i]} alt="Memory" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs text-muted">Loading...</div>
                                    )}
                                    {photo.starred && <div className="absolute top-2 right-2 text-yellow-400">★</div>}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Journal */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider opacity-60">Journal Entry</h3>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                            {entry.journal || "No written entry for this day."}
                        </p>
                    </div>

                    {/* Voice Note Status */}
                    {entry.audio && (
                        <div className="p-3 rounded-lg flex items-center gap-3" style={{ background: 'var(--bg-elevated)' }}>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500/20 text-green-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium">Voice Note Recorded</p>
                                <p className="text-xs opacity-60">Voice notes can only be played on the day they were recorded.</p>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

export default DayViewModal;
