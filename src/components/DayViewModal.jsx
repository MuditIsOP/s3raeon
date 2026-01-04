import { motion, AnimatePresence } from 'framer-motion';
import { formatDate } from '../utils/timeUtils';
import { s3Client } from '../storj';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { useState, useEffect } from 'react';
import PremiumAudioPlayer from './PremiumAudioPlayer';

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
                    {/* Photos Section */}
                    {mode !== 'voice' && entry.photos && entry.photos.length > 0 && (
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Photo Memories</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {entry.photos.map((photo, i) => (
                                    <div key={i} className="aspect-square rounded-2xl overflow-hidden bg-white/5 relative shadow-lg group">
                                        {photoUrls[i] ? (
                                            <img src={photoUrls[i]} alt="Memory" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs text-muted">Loading...</div>
                                        )}
                                        {photo.starred && <div className="absolute top-2 right-2 text-yellow-400 drop-shadow-md">★</div>}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Divider if needed */}
                    {mode !== 'voice' && entry.photos?.length > 0 && entry.journal && <div className="h-px bg-white/5" />}

                    {/* Journal Section */}
                    {mode !== 'voice' && entry.journal && (
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Daily Journal</h3>
                            </div>

                            <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                                {/* Prompt */}
                                {entry.prompt && (
                                    <div className="mb-4 pl-4 border-l-2 border-indigo-500/50">
                                        <p className="text-sm font-medium italic text-indigo-200/80">
                                            "{entry.prompt}"
                                        </p>
                                    </div>
                                )}

                                {/* Answer */}
                                <p className="text-base leading-relaxed whitespace-pre-wrap font-light text-[var(--text-secondary)]">
                                    {entry.journal}
                                </p>
                            </div>
                        </section>
                    )}

                    {/* Voice Mode Affirmation View */}
                    {mode === 'voice' && entry.affirmation && (
                        <div className="space-y-6 text-center py-8">
                            <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                            </div>
                            <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--text-muted)]">Daily Affirmation</h3>
                            <p className="text-2xl font-serif italic text-[var(--text)] px-4 leading-relaxed">
                                "{entry.affirmation}"
                            </p>
                        </div>
                    )}

                    {/* Divider */}
                    {mode !== 'voice' && (entry.journal || entry.photos?.length > 0) && entry.audioUrl && <div className="h-px bg-white/5" />}

                    {/* Voice Player Section */}
                    {entry.audioUrl && (
                        <section>
                            {mode !== 'voice' && (
                                <div className="flex items-center gap-2 mb-4">
                                    <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Voice Note</h3>
                                </div>
                            )}

                            <div className="p-1 rounded-3xl" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)' }}>
                                <div className="p-5 rounded-[1.3rem] space-y-4 bg-[#0F0F13] border border-white/5 relative overflow-hidden">
                                    {/* Glow Effect */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[50px] pointer-events-none" />

                                    <div className="flex items-center gap-4 mb-2 relative z-10">
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 border border-indigo-500/20">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                        </div>
                                        <div>
                                            <p className="text-base font-bold text-[var(--text)]">Voice Affirmation</p>
                                            <p className="text-xs text-[var(--text-muted)]">Recorded on {formatDate(date)}</p>
                                        </div>
                                    </div>

                                    <div className="relative z-10">
                                        {audioUrl ? (
                                            <PremiumAudioPlayer audioUrl={audioUrl} />
                                        ) : (
                                            <div className="h-32 flex items-center justify-center bg-black/20 rounded-xl border border-white/5">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                                    <span className="text-xs text-[var(--text-muted)]">Loading audio...</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>
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
