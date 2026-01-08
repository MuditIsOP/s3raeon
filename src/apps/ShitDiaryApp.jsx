import { useState, useEffect, useContext } from 'react';
import { Routes, Route, useLocation, Link, useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { loadEntries, saveEntry } from '../storj';
import { getTodayIST } from '../utils/timeUtils';
import { DiaryContext } from '../App';
import Header from '../components/Header';
import Stats from '../pages/Stats';
import Profile from '../pages/Profile';

// SHIT'S DIARY Component
const SHIT_BUCKET = 'mudit-diary';

const MOOD_EMOJIS = {
    1: '🤩', // Great
    2: '🙂', // Good
    3: '😐', // Okay
    4: '😔', // Low
    5: '😭', // Hard
};

function ShitDiaryApp() {
    return (
        <div className="theme-shit min-h-screen pb-20">
            <ShitDiaryProvider>
                <ShitRoutes />
            </ShitDiaryProvider>
        </div>
    );
}

function ShitDiaryProvider({ children }) {
    const [entries, setEntries] = useState({});
    const [todayEntry, setTodayEntry] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentStreak, setCurrentStreak] = useState(0);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await loadEntries(SHIT_BUCKET);
            setEntries(data || {});

            const today = getTodayIST();
            setTodayEntry(data?.[today] || null);

            // Simple streak logic (count days with entries)
            const days = Object.keys(data || {}).length;
            setCurrentStreak(days); // Using simpler metric for now
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveEntry = async (date, entry) => {
        // Save to specific bucket
        await saveEntry(date, entry, SHIT_BUCKET);

        // Update local state
        const newEntries = {
            ...entries,
            [date]: { ...entries[date], ...entry, updatedAt: new Date().toISOString() }
        };
        setEntries(newEntries);
        setTodayEntry(newEntries[date]);
    };

    const contextValue = {
        entries,
        todayEntry,
        loading,
        currentStreak,
        saveEntry: handleSaveEntry,
        togglePhotoStar: () => { }, // No photos
        toggleDayStar: () => { },
        bucketName: SHIT_BUCKET, // CRITICAL: Propagate bucket name
    };

    if (loading) return <div className="p-12 text-center text-white">Loading...</div>;

    return (
        <DiaryContext.Provider value={contextValue}>
            {children}
        </DiaryContext.Provider>
    );
}

function ShitRoutes() {
    const location = useLocation();

    return (
        <>
            <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                    <Route path="/" element={<ShitEntryEditor />} />
                    <Route path="/history" element={<ShitHistory />} />
                    <Route path="/history/:date" element={<ShitEntryEditor />} />
                    <Route path="/stats" element={<Stats />} />
                    <Route path="/profile" element={<Profile />} />
                    {/* Add fallback to avoid white screen on 404 within /shit */}
                    <Route path="*" element={<ShitEntryEditor />} />
                </Routes>
            </AnimatePresence>
            <ShitBottomNav />
        </>
    );
}

// Helper to use context
const useShitDiary = () => useContext(DiaryContext);

function ShitEntryEditor() {
    const { entries, saveEntry } = useShitDiary();
    const { date } = useParams();
    const navigate = useNavigate();
    const todayIST = getTodayIST();

    // Determine target date: URL param OR today
    const targetDate = date || todayIST;
    const isToday = targetDate === todayIST;

    const [mood, setMood] = useState(null);
    const [text, setText] = useState('');
    const [saved, setSaved] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Derived state for the selected entry
    const entry = entries[targetDate];

    // Initial load: Set editing mode based on entry existence
    useEffect(() => {
        if (entry) {
            setMood(entry.mood || null);
            setText(entry.journal || '');
            setIsEditing(false); // Default to read mode if entry exists
        } else {
            setMood(null);
            setText('');
            setIsEditing(true); // Default to edit mode if new
        }
    }, [entry, targetDate]);

    const handleSave = async () => {
        await saveEntry(targetDate, { mood, journal: text, completed: true });
        setSaved(true);
        setIsEditing(false); // Switch to read mode after save
        setTimeout(() => setSaved(false), 2000);
    };

    // Format date for display
    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' });
    };

    return (
        <div className="page p-4">
            <Header
                title={isToday ? "SHIT'S DIARY" : formatDate(targetDate)}
                onClose={!isToday ? () => navigate('/shit/history') : undefined}
            />

            <div className="card mb-6 mt-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="card-title">{isToday ? "How was your day?" : "Entry Details"}</h2>
                    {!isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="text-xs font-semibold text-[var(--primary)] hover:underline"
                        >
                            EDIT
                        </button>
                    )}
                </div>

                {isEditing ? (
                    <>
                        {/* EDIT MODE */}
                        <div className="flex justify-between gap-2 mb-6">
                            {[1, 2, 3, 4, 5].map(m => (
                                <button
                                    key={m}
                                    onClick={() => setMood(m)}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all ${mood === m ? 'bg-[var(--primary)] scale-110 shadow-lg shadow-orange-500/20' : 'bg-[var(--bg-elevated)] grayscale opacity-70 hover:grayscale-0 hover:opacity-100'}`}
                                >
                                    {MOOD_EMOJIS[m]}
                                </button>
                            ))}
                        </div>

                        <textarea
                            value={text}
                            onChange={e => setText(e.target.value)}
                            placeholder="Write anything..."
                            className="w-full h-64 bg-transparent resize-none border-none outline-none text-lg leading-relaxed"
                        />

                        <div className="flex justify-end mt-4">
                            <button
                                onClick={handleSave}
                                className="btn-primary"
                            >
                                {saved ? 'Saved!' : 'Save Entry'}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* READ MODE */}
                        <div className="mb-6 flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-4xl mb-2">
                                {mood ? MOOD_EMOJIS[mood] : '😶'}
                            </div>
                            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
                                MOOD
                            </span>
                        </div>

                        <div className="prose prose-invert max-w-none text-lg leading-relaxed whitespace-pre-wrap text-[var(--text)]">
                            {text || <span className="text-[var(--text-muted)] italic">No text written...</span>}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function ShitHistory() {
    const { entries } = useShitDiary();
    const navigate = useNavigate();

    // Sort entries by date descending
    const sortedDates = Object.keys(entries).sort((a, b) => new Date(b) - new Date(a));

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
    };

    return (
        <div className="page p-4">
            <Header title="History" />

            <div className="space-y-3 mt-4">
                {sortedDates.length === 0 ? (
                    <div className="text-center text-[var(--text-muted)] py-10">
                        No entries yet. Start writing!
                    </div>
                ) : (
                    sortedDates.map(date => {
                        const entry = entries[date];
                        return (
                            <div
                                key={date}
                                onClick={() => navigate(`/shit/history/${date}`)}
                                className="card flex items-center gap-4 p-4 active:scale-95 transition-transform cursor-pointer"
                            >
                                <div className="text-3xl">
                                    {entry.mood ? MOOD_EMOJIS[entry.mood] : '😶'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-[var(--text)]">
                                        {formatDate(date)}
                                    </div>
                                    <div className="text-sm text-[var(--text-muted)] truncate">
                                        {entry.journal || 'No text written...'}
                                    </div>
                                </div>
                                <div className="text-[var(--text-muted)]">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

function ShitBottomNav() {
    const location = useLocation();

    const items = [
        { path: '/shit', label: 'Home', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
        { path: '/shit/stats', label: 'Stats', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
        { path: '/shit/history', label: 'History', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
        { path: '/shit/profile', label: 'Profile', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-[var(--bg-card)]/90 backdrop-blur-lg border-t border-[var(--border)] pb-safe z-50">
            <div className="flex items-center justify-around h-16">
                {items.map((item) => {
                    // Check active state more carefully for root path /shit
                    const isActive = item.path === '/shit'
                        ? location.pathname === '/shit' || location.pathname === '/shit/'
                        : location.pathname.startsWith(item.path);

                    return (
                        <Link
                            to={item.path}
                            key={item.path}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}
                        >
                            {item.icon}
                            <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

export default ShitDiaryApp;
