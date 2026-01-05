import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useDiary } from '../App';
import { formatDate } from '../utils/timeUtils';
import Header from '../components/Header';
import TermsModal from '../components/TermsModal';
import GuidelinesModal from '../components/GuidelinesModal';
import DayViewModal from '../components/DayViewModal';
import ExportModal from '../components/ExportModal';
import AboutModal from '../components/AboutModal';

// Animation Variants
const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

const MENU_ICONS = {
    calendar: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    search: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
    export: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
    terms: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    guidelines: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    voice: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>,
    about: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>,
};


const MOOD_CONFIG = [
    { value: 1, label: 'Great', color: '#22c55e' },
    { value: 2, label: 'Good', color: '#84cc16' },
    { value: 3, label: 'Okay', color: '#eab308' },
    { value: 4, label: 'Low', color: '#f97316' },
    { value: 5, label: 'Hard', color: '#ef4444' },
];

function More() {
    const { entries } = useDiary();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearch, setShowSearch] = useState(false);
    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const [moodFilter, setMoodFilter] = useState(null); // New state
    const [showTerms, setShowTerms] = useState(false);
    const [showGuidelines, setShowGuidelines] = useState(false);
    const [showExport, setShowExport] = useState(false);
    const [showAbout, setShowAbout] = useState(false);

    const [selectedVoiceDate, setSelectedVoiceDate] = useState(null);

    // Load all entries sorted by date (descending) when search opens
    const allEntries = useMemo(() => Object.entries(entries)
        .sort((a, b) => new Date(b[0]) - new Date(a[0]))
        .map(([date, entry]) => ({
            date,
            excerpt: entry.journal,
            affirmation: entry.affirmation,
            mood: entry.mood,
            hasAudio: !!entry.audioUrl
        })), [entries]);

    const performSearch = (query, mood, voiceMode) => {
        let filtered = allEntries;

        // 1. Filter by Voice Mode
        if (voiceMode) {
            filtered = filtered.filter(e => e.hasAudio);
        }

        // 2. Filter by Mood
        if (mood) {
            filtered = filtered.filter(e => e.mood === mood);
        }

        // 3. Filter by Query
        if (query.trim()) {
            const lowerQuery = query.toLowerCase();
            filtered = filtered.filter(item =>
                item.excerpt?.toLowerCase().includes(lowerQuery) ||
                item.affirmation?.toLowerCase().includes(lowerQuery) ||
                formatDate(item.date).toLowerCase().includes(lowerQuery)
            );
        }

        setSearchResults(filtered);
    };

    const handleSearch = (query) => {
        setSearchQuery(query);
        performSearch(query, moodFilter, isVoiceMode);
    };

    const handleMoodSelect = (mood) => {
        const newMood = mood === moodFilter ? null : mood;
        setMoodFilter(newMood);
        performSearch(searchQuery, newMood, isVoiceMode);
    };

    // Initialize search results when opening search
    const openSearch = () => {
        setIsVoiceMode(false);
        setShowSearch(true);
        setSearchQuery('');
        setMoodFilter(null);
        setSearchResults(allEntries);
    };

    const openVoiceJourney = () => {
        setIsVoiceMode(true);
        setShowSearch(true);
        setSearchQuery('');
        setMoodFilter(null);
        // Initial filter for voice
        performSearch('', null, true);
    };

    const handleEnableNotifications = async () => {
        try {
            const { requestForToken } = await import('../firebase');
            const token = await requestForToken();
            if (token) {
                navigator.clipboard.writeText(token);
                alert("✨ Notifications Enabled! \n\nA special connection code has been copied to your clipboard. \n\nPlease send this code to Mudit so he can send you reminders! 💌");
            } else {
                alert("Permission needed for notifications.");
            }
        } catch (error) {
            console.error(error);
            alert("Failed to enable notifications.");
        }
    };

    const menuItems = [
        { title: 'Calendar', desc: 'View by date', icon: MENU_ICONS.calendar, path: '/calendar' },
        { title: 'Search', desc: 'Find entries', icon: MENU_ICONS.search, action: openSearch },
        { title: 'Voice Journey', desc: 'Listen to past affirmations', icon: MENU_ICONS.voice, action: openVoiceJourney },
        { title: 'Notifications', desc: 'Enable reminders', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>, action: handleEnableNotifications },
        { title: 'Usage Guidelines', desc: 'How to use S3RΛEON', icon: MENU_ICONS.guidelines, action: () => setShowGuidelines(true) },
        { title: 'Terms & Conditions', desc: 'View agreed terms', icon: MENU_ICONS.terms, action: () => setShowTerms(true) },
        { title: 'Export Data', desc: 'Backup to JSON, TXT, or CSV', icon: MENU_ICONS.export, action: () => setShowExport(true) },
        { title: 'About S3RΛEON', desc: 'A message for you', icon: MENU_ICONS.about, action: () => setShowAbout(true) },
    ];

    const handleResultClick = (date) => {
        if (isVoiceMode) {
            setSelectedVoiceDate(date);
        } else {
            navigate('/calendar', {
                state: {
                    date,
                    viewMode: 'full'
                }
            });
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="page">
            <Header title="More" />

            {showSearch ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex items-center gap-3 mb-4">
                        <button onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); setIsVoiceMode(false); }} className="btn-icon">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        {isVoiceMode ? (
                            <h2 className="text-lg font-bold text-gradient flex-1">Voice Journey</h2>
                        ) : (
                            <input type="text" value={searchQuery} onChange={(e) => handleSearch(e.target.value)} placeholder="Search..." className="input-field flex-1" autoFocus />
                        )}
                    </div>

                    {/* Mood Filter Bar */}
                    <div className="grid grid-cols-5 gap-1.5 mb-4 p-1">
                        {MOOD_CONFIG.map((m) => {
                            const isActive = moodFilter === m.value;
                            return (
                                <button
                                    key={m.value}
                                    onClick={() => handleMoodSelect(m.value)}
                                    className={`
                                        relative flex flex-col items-center justify-center gap-1 py-3 rounded-2xl transition-all duration-300
                                        border backdrop-blur-md overflow-visible group
                                    `}
                                    style={{
                                        backgroundColor: isActive ? `${m.color}20` : 'rgba(255,255,255,0.03)',
                                        borderColor: isActive ? m.color : 'rgba(255,255,255,0.05)',
                                        color: isActive ? m.color : 'var(--text-secondary)',
                                        boxShadow: isActive ? `0 4px 20px ${m.color}30` : 'none',
                                        transform: isActive ? 'translateY(-2px)' : 'none',
                                        zIndex: isActive ? 10 : 1
                                    }}
                                >
                                    {/* Color Dot with Glow */}
                                    <div
                                        className="w-2.5 h-2.5 rounded-full transition-all duration-300"
                                        style={{
                                            backgroundColor: m.color,
                                            boxShadow: isActive ? `0 0 10px ${m.color}` : 'none',
                                        }}
                                    />

                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{m.label}</span>

                                    {/* Active Shine Effect */}
                                    {isActive && (
                                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/0 via-white/10 to-white/0 animate-pulse pointer-events-none" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {searchResults.length === 0 && !isVoiceMode && searchQuery.length >= 2 && <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No results</p>}
                    {searchResults.length === 0 && isVoiceMode && (
                        <div className="text-center py-12">
                            <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center bg-white/5 text-gray-500">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                            </div>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No voice affirmations yet</p>
                        </div>
                    )}
                    {searchResults.map((r) => (
                        <div key={r.date} onClick={() => handleResultClick(r.date)} className="card mb-3 cursor-pointer hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-gradient">{formatDate(r.date)}</span>
                            </div>
                            <p className="text-sm line-clamp-2" style={{
                                color: (isVoiceMode ? r.affirmation : r.excerpt) ? 'var(--text-secondary)' : 'var(--text-muted)',
                                fontStyle: (isVoiceMode ? r.affirmation : r.excerpt) ? 'normal' : 'italic'
                            }}>
                                {(() => {
                                    const text = isVoiceMode ? (r.affirmation || "Affirmation not recorded") : (r.excerpt || "Journal not written yet");
                                    if (!searchQuery?.trim()) return text;

                                    // Highlight logic
                                    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
                                    return parts.map((part, i) =>
                                        part.toLowerCase() === searchQuery.toLowerCase() ?
                                            <span key={i} className="bg-yellow-500/30 text-yellow-200 rounded px-0.5">{part}</span> : part
                                    );
                                })()}
                            </p>
                        </div>
                    ))}
                </motion.div>
            ) : (
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="space-y-3"
                >
                    {menuItems.map((menuItem) => (
                        <motion.div key={menuItem.title} variants={item}>
                            {menuItem.path ? (
                                <Link to={menuItem.path} className="card flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>{menuItem.icon}</div>
                                    <div className="flex-1">
                                        <p className="font-semibold" style={{ color: 'var(--text)' }}>{menuItem.title}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{menuItem.desc}</p>
                                    </div>
                                    <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </Link>
                            ) : (
                                <button onClick={menuItem.action} className="card w-full flex items-center gap-4 text-left">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>{menuItem.icon}</div>
                                    <div className="flex-1">
                                        <p className="font-semibold" style={{ color: 'var(--text)' }}>{menuItem.title}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{menuItem.desc}</p>
                                    </div>
                                    <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            )}
                        </motion.div>
                    ))}

                    <motion.div variants={item} className="text-center pt-12">
                        <p className="logo-text text-sm">S3RΛ<span className="logo-accent">EON</span></p>
                        <a href="https://api.whatsapp.com/send?phone=916393189634&text=Hello%20" target="_blank" rel="noopener noreferrer" className="text-xs mt-1 block hover:text-[var(--primary)] transition-colors" style={{ color: 'var(--text-muted)' }}>from Mudit</a>
                    </motion.div>
                </motion.div>
            )}

            <AnimatePresence>
                {showTerms && <TermsModal onClose={() => setShowTerms(false)} readOnly={true} />}
                {showGuidelines && <GuidelinesModal onClose={() => setShowGuidelines(false)} readOnly={true} />}
                {showExport && <ExportModal onClose={() => setShowExport(false)} entries={entries} />}
                {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
                {selectedVoiceDate && (
                    <DayViewModal
                        date={selectedVoiceDate}
                        entry={entries[selectedVoiceDate]}
                        mode="voice"
                        onClose={() => setSelectedVoiceDate(null)}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default More;
