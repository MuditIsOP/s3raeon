import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useDiary } from '../App';
import { formatDate } from '../utils/timeUtils';
import Header from '../components/Header';
import TermsModal from '../components/TermsModal';
import GuidelinesModal from '../components/GuidelinesModal';

const MENU_ICONS = {
    calendar: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    search: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
    export: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
    terms: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    guidelines: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
};

function More() {
    const { entries } = useDiary();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearch, setShowSearch] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [showGuidelines, setShowGuidelines] = useState(false);

    // Load all entries sorted by date (descending) when search opens
    const allEntries = Object.entries(entries)
        .sort((a, b) => new Date(b[0]) - new Date(a[0]))
        .map(([date, entry]) => ({ date, excerpt: entry.journal, mood: entry.mood }));

    const handleSearch = (query) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setSearchResults(allEntries);
            return;
        }
        const lowerQuery = query.toLowerCase();
        const filtered = allEntries.filter(item =>
            item.excerpt?.toLowerCase().includes(lowerQuery) ||
            formatDate(item.date).toLowerCase().includes(lowerQuery)
        );
        setSearchResults(filtered);
    };

    // Initialize search results when opening search
    const openSearch = () => {
        setShowSearch(true);
        setSearchResults(allEntries);
    };

    const handleExport = () => {
        const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 's3raeon-backup.json'; a.click();
        URL.revokeObjectURL(url);
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
        { title: 'Notifications', desc: 'Enable reminders', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>, action: handleEnableNotifications },
        { title: 'Usage Guidelines', desc: 'How to use S3RΛEON', icon: MENU_ICONS.guidelines, action: () => setShowGuidelines(true) },
        { title: 'Terms & Conditions', desc: 'View agreed terms', icon: MENU_ICONS.terms, action: () => setShowTerms(true) },
        { title: 'Export', desc: 'Backup data', icon: MENU_ICONS.export, action: handleExport },
    ];

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="page">
            <Header title="More" />

            {showSearch ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex items-center gap-3 mb-4">
                        <button onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }} className="btn-icon">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <input type="text" value={searchQuery} onChange={(e) => handleSearch(e.target.value)} placeholder="Search..." className="input-field flex-1" autoFocus />
                    </div>
                    {searchResults.length === 0 && searchQuery.length >= 2 && <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No results</p>}
                    {searchResults.map((r) => (
                        <div key={r.date} className="card mb-3">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-gradient">{formatDate(r.date)}</span>
                            </div>
                            <p className="text-sm line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{r.excerpt}</p>
                        </div>
                    ))}
                </motion.div>
            ) : (
                <div className="space-y-3">
                    {menuItems.map((item, i) => (
                        <motion.div key={item.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            {item.path ? (
                                <Link to={item.path} className="card flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>{item.icon}</div>
                                    <div className="flex-1">
                                        <p className="font-semibold" style={{ color: 'var(--text)' }}>{item.title}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                                    </div>
                                    <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </Link>
                            ) : (
                                <button onClick={item.action} className="card w-full flex items-center gap-4 text-left">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>{item.icon}</div>
                                    <div className="flex-1">
                                        <p className="font-semibold" style={{ color: 'var(--text)' }}>{item.title}</p>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                                    </div>
                                    <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            )}
                        </motion.div>
                    ))}

                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-center pt-12">
                        <p className="logo-text text-sm">S3RΛ<span className="logo-accent">EON</span></p>
                        <a href="https://api.whatsapp.com/send?phone=916393189634&text=Hello%20" target="_blank" rel="noopener noreferrer" className="text-xs mt-1 block hover:text-[var(--primary)] transition-colors" style={{ color: 'var(--text-muted)' }}>from Mudit</a>
                    </motion.div>
                </div>
            )}

            <AnimatePresence>
                {showTerms && <TermsModal onClose={() => setShowTerms(false)} readOnly={true} />}
                {showGuidelines && <GuidelinesModal onClose={() => setShowGuidelines(false)} readOnly={true} />}
            </AnimatePresence>
        </motion.div>
    );
}

export default More;
