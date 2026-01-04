import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDiary } from '../App';
import { formatDate, getDayOfMonth } from '../utils/timeUtils';
import { DateTime } from 'luxon';
import Header from '../components/Header';

const MOOD_CONFIG = [
    { value: 1, label: 'Great', color: '#22c55e' },
    { value: 2, label: 'Good', color: '#84cc16' },
    { value: 3, label: 'Okay', color: '#eab308' },
    { value: 4, label: 'Low', color: '#f97316' },
    { value: 5, label: 'Hard', color: '#ef4444' },
];

function Gallery() {
    const { entries, togglePhotoStar } = useDiary();
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [activeTab, setActiveTab] = useState('all');
    const [moodFilter, setMoodFilter] = useState(null);

    const { allPhotos, favorites, monthlyPhotos } = useMemo(() => {
        const all = [], favs = [], monthly = {};
        Object.entries(entries).forEach(([date, entry]) => {
            if (entry.photos) {
                // Filter by mood if active
                if (moodFilter && entry.mood !== moodFilter) return;

                entry.photos.forEach((photo, index) => {
                    const photoData = { ...photo, date, index, dayOfMonth: getDayOfMonth(date), mood: entry.mood, journal: entry.journal };
                    all.push(photoData);
                    if (photo.starred) favs.push(photoData);
                    const monthKey = DateTime.fromISO(date).toFormat('yyyy-MM');
                    if (!monthly[monthKey]) monthly[monthKey] = { label: DateTime.fromISO(date).toFormat('MMMM yyyy'), photos: [] };
                    monthly[monthKey].photos.push(photoData);
                });
            }
        });

        // Sort function: Newest first by timestamp
        const getTime = (p) => DateTime.fromISO(p.timestamp || p.date).toMillis();
        const compare = (a, b) => getTime(b) - getTime(a);

        all.sort(compare);
        favs.sort(compare);

        // Also sort photos within each month group
        Object.values(monthly).forEach(m => m.photos.sort(compare));

        return { allPhotos: all, favorites: favs, monthlyPhotos: monthly };
    }, [entries, moodFilter]);

    const handleStar = async (photo) => {
        await togglePhotoStar(photo.date, photo.index);
        // Update selectedPhoto state immediately if this photo is currently selected
        if (selectedPhoto && selectedPhoto.date === photo.date && selectedPhoto.index === photo.index) {
            setSelectedPhoto({ ...selectedPhoto, starred: !selectedPhoto.starred });
        }
    };

    const StarIcon = ({ filled }) => (
        <svg className="w-4 h-4" fill={filled ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
    );

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="page">
            <Header title="Gallery" />

            {/* Mood Filter Bar */}
            <div className="flex items-center mb-6 overflow-x-auto pb-2 gap-3 no-scrollbar mask-gradient-x">
                {MOOD_CONFIG.map((m) => {
                    const isActive = moodFilter === m.value;
                    return (
                        <button
                            key={m.value}
                            onClick={() => setMoodFilter(isActive ? null : m.value)}
                            className={`
                                relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
                                border backdrop-blur-sm whitespace-nowrap overflow-hidden group
                            `}
                            style={{
                                backgroundColor: isActive ? `${m.color}20` : 'rgba(255,255,255,0.03)',
                                borderColor: isActive ? m.color : 'rgba(255,255,255,0.1)',
                                color: isActive ? m.color : 'var(--text-secondary)',
                                boxShadow: isActive ? `0 0 15px ${m.color}40` : 'none',
                                transform: isActive ? 'scale(1.05)' : 'scale(1)',
                            }}
                        >
                            {/* Color Dot with Glow */}
                            <div
                                className="w-2 h-2 rounded-full transition-all duration-300"
                                style={{
                                    backgroundColor: m.color,
                                    boxShadow: `0 0 8px ${m.color}`,
                                    opacity: isActive ? 1 : 0.7
                                }}
                            />

                            {m.label}

                            {/* Active Shine Effect */}
                            {isActive && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 animate-shine" />
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="flex gap-2 mb-6">
                {['all', 'favorites'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === tab ? 'text-white' : ''}`}
                        style={{
                            background: activeTab === tab ? 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)' : 'var(--bg-elevated)',
                            color: activeTab === tab ? 'white' : 'var(--text-secondary)',
                            border: `1px solid ${activeTab === tab ? 'transparent' : 'var(--border)'}`
                        }}
                    >
                        {tab === 'all' ? `All (${allPhotos.length})` : `Favourites (${favorites.length})`}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'favorites' ? (
                    <motion.div key="favorites" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {favorites.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                                    <StarIcon filled={false} />
                                </div>
                                <p style={{ color: 'var(--text-secondary)' }}>No favorites yet</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-1">
                                {favorites.map((photo) => <PhotoTile key={`${photo.date}-${photo.index}`} photo={photo} onClick={() => setSelectedPhoto(photo)} onLongPress={() => handleStar(photo)} />)}
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div key="all" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {allPhotos.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                                <p style={{ color: 'var(--text-secondary)' }}>No photos yet</p>
                            </div>
                        ) : (
                            Object.entries(monthlyPhotos).sort(([a], [b]) => b.localeCompare(a)).map(([monthKey, { label, photos }]) => (
                                <div key={monthKey} className="mb-6">
                                    <p className="text-label mb-3">{label}</p>
                                    <div className="grid grid-cols-3 gap-1">
                                        {photos.map((photo) => <PhotoTile key={`${photo.date}-${photo.index}`} photo={photo} onClick={() => setSelectedPhoto(photo)} onLongPress={() => handleStar(photo)} />)}
                                    </div>
                                </div>
                            ))
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedPhoto && (
                    <PhotoModal
                        photo={selectedPhoto}
                        onClose={() => setSelectedPhoto(null)}
                        onStar={() => handleStar(selectedPhoto)}
                        allPhotos={allPhotos}
                        currentIndex={allPhotos.findIndex(p => p.date === selectedPhoto.date && p.index === selectedPhoto.index)}
                        onNavigate={(newIndex) => setSelectedPhoto(allPhotos[newIndex])}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function PhotoTile({ photo, onClick, onLongPress }) {
    const [timer, setTimer] = useState(null);
    const handleTouchStart = () => { const t = setTimeout(onLongPress, 500); setTimer(t); };
    const handleTouchEnd = () => { if (timer) { clearTimeout(timer); setTimer(null); } };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="photo-item" onClick={onClick} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onMouseDown={handleTouchStart} onMouseUp={handleTouchEnd} onMouseLeave={handleTouchEnd}>
            <img src={photo.url} alt="" loading="lazy" />
            {photo.starred && (
                <div className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', color: '#FBBF24' }}>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                </div>
            )}
        </motion.div>
    );
}

function PhotoModal({ photo, onClose, onStar, allPhotos, currentIndex, onNavigate }) {
    const handleStarClick = (e) => {
        e.stopPropagation();
        onStar();
    };

    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < allPhotos.length - 1;

    const handlePrev = (e) => {
        e.stopPropagation();
        if (hasPrev) onNavigate(currentIndex - 1);
    };

    const handleNext = (e) => {
        e.stopPropagation();
        if (hasNext) onNavigate(currentIndex + 1);
    };

    return (
        <>
            {/* Backdrop - clicking closes */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 z-50" onClick={onClose} />

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4" onClick={onClose}>
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.1)' }}
                >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Left Arrow */}
                {hasPrev && (
                    <button
                        onClick={handlePrev}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110"
                        style={{ background: 'rgba(255,255,255,0.1)' }}
                    >
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                )}

                {/* Right Arrow */}
                {hasNext && (
                    <button
                        onClick={handleNext}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110"
                        style={{ background: 'rgba(255,255,255,0.1)' }}
                    >
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                )}

                {/* Image - clicking does NOT close */}
                <img src={photo.url} alt="" className="max-w-full max-h-[70vh] object-contain rounded-xl" onClick={(e) => e.stopPropagation()} />

                <div className="mt-4 flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                    <span style={{ color: 'var(--text-muted)' }}>{formatDate(photo.date)}</span>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                    const response = await fetch(photo.url);
                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `S3RAEON_${photo.date}_${photo.index}.jpg`;
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    document.body.removeChild(a);
                                } catch (error) {
                                    console.error('Download failed:', error);
                                }
                            }}
                            className="w-10 h-10 rounded-full flex items-center justify-center transition-all bg-[rgba(255,255,255,0.1)] text-[var(--text-muted)] hover:bg-[rgba(255,255,255,0.2)] hover:text-white"
                            title="Download Photo"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        </button>

                        <button
                            onClick={handleStarClick}
                            className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                            style={{
                                background: photo.starred ? '#FBBF24' : 'rgba(255,255,255,0.1)',
                                color: photo.starred ? 'white' : 'var(--text-muted)'
                            }}
                        >
                            <svg className="w-5 h-5" fill={photo.starred ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </motion.div>
        </>
    );
}

export default Gallery;
