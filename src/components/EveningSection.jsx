import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDiary } from '../App';
import { getTodayIST, getDayOfMonth, getMonthDay } from '../utils/timeUtils';
import MoodPicker from './MoodPicker';
import prompts from '../data/evening_prompts.json';

function EveningSection({ todayEntry, isUnlocked }) {
    const { saveEntry } = useDiary();
    const today = getTodayIST();
    const dayOfMonth = getDayOfMonth();
    const monthDay = getMonthDay();

    const dailyPrompt = prompts.special[monthDay] || prompts.prompts[dayOfMonth] || prompts.prompts['1'];
    const prompt = `How was your day? ${dailyPrompt}`;

    const [journal, setJournal] = useState(todayEntry?.journal || '');
    const [mood, setMood] = useState(todayEntry?.mood || null);
    const [saving, setSaving] = useState(false);
    const [showJournal, setShowJournal] = useState(false);

    useEffect(() => { if (todayEntry?.journal) setJournal(todayEntry.journal); if (todayEntry?.mood) setMood(todayEntry.mood); }, [todayEntry?.journal, todayEntry?.mood]);

    const handleSave = async () => {
        try {
            setSaving(true);
            const completed = todayEntry?.morningCompleted && journal.length > 0 && mood !== null;
            await saveEntry(today, { journal, mood, prompt, eveningCompleted: journal.length > 0 && mood !== null, completed });
            setShowJournal(false);
        } catch (error) { console.error('Error:', error); }
        finally { setSaving(false); }
    };

    return (
        <section className="card">
            <div className="card-header">
                <h2 className="card-title">Daily Reflection</h2>
                {todayEntry?.eveningCompleted && <div className="completed-badge"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div>}
            </div>

            <AnimatePresence mode="wait">
                {!isUnlocked ? (
                    <motion.div key="locked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="locked-state">
                        <div className="icon"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></div>
                        <p className="title">8 PM - 12 AM</p>
                        <p className="subtitle">Write your reflection</p>
                    </motion.div>
                ) : todayEntry?.eveningCompleted ? (
                    <motion.div key="completed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)' }}><svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
                            <div className="flex-1"><p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Saved</p></div>
                        </div>
                        <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>"{journal.substring(0, 50)}..."</p>
                        <button onClick={() => setShowJournal(true)} className="text-sm font-medium text-gradient">Edit →</button>
                    </motion.div>
                ) : (
                    <motion.div key="unlocked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <p className="text-label mb-1">Prompt</p>
                        <p className="text-sm italic mb-4" style={{ color: 'var(--text-secondary)' }}>"{prompt.substring(0, 80)}..."</p>
                        <button onClick={() => setShowJournal(true)} className="btn-primary"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>Journal</button>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showJournal && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-backdrop" onClick={() => setShowJournal(false)} />
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="bottom-sheet">
                            <div className="sheet-handle" />
                            <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--text)' }}>Evening</h3>
                            <p className="text-xs italic mb-5" style={{ color: 'var(--text-muted)' }}>"{prompt}"</p>
                            <div className="mb-4">
                                <p className="text-label mb-2">How was today?</p>
                                <MoodPicker selected={mood} onSelect={setMood} />
                            </div>
                            <div className="mb-4">
                                <textarea value={journal} onChange={(e) => setJournal(e.target.value)} placeholder="Your thoughts..." rows={4} className="input-field resize-none" />
                            </div>
                            <button onClick={handleSave} disabled={saving || !mood || !journal.trim()} className="btn-primary">
                                {saving ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />...</span> : 'Save'}
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </section>
    );
}

export default EveningSection;
