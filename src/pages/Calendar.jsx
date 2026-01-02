import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDiary } from '../App';
import { getCurrentMonthYear, getDaysInMonth, getTodayIST, isFutureDate } from '../utils/timeUtils';
import { DateTime } from 'luxon';
import Header from '../components/Header';
import DayViewModal from '../components/DayViewModal';

function Calendar() {
    const { entries } = useDiary();
    const navigate = useNavigate();
    const location = useLocation();
    const today = getTodayIST();
    const currentMonthData = getCurrentMonthYear();

    // Default to current month, unless deep link provided
    const [viewMonth, setViewMonth] = useState(currentMonthData.month);
    const [viewYear, setViewYear] = useState(currentMonthData.year);
    const [selectedDate, setSelectedDate] = useState(null);

    // Deep Linking Effect
    useEffect(() => {
        if (location.state?.date) {
            const date = DateTime.fromISO(location.state.date);
            if (date.isValid) {
                setViewMonth(date.month);
                setViewYear(date.year);
                setSelectedDate(location.state.date);
                // Clear state so back button works nicely
                navigate(location.pathname, { replace: true, state: {} });
            }
        }
    }, [location.state, navigate]);

    const days = getDaysInMonth(viewYear, viewMonth);
    const monthLabel = DateTime.fromObject({ year: viewYear, month: viewMonth }).toFormat('MMMM yyyy');

    const goToPrevMonth = () => { if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1); } else { setViewMonth(viewMonth - 1); } };
    const goToNextMonth = () => { if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1); } else { setViewMonth(viewMonth + 1); } };
    const canGoNext = !(viewYear === currentMonthData.year && viewMonth === currentMonthData.month);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="page">
            <Header title="Calendar" showProfile={false} onClose={() => navigate(-1)} />

            <div className="flex items-center justify-between mb-6">
                <button onClick={goToPrevMonth} className="btn-icon">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="font-semibold" style={{ color: 'var(--text)' }}>{monthLabel}</span>
                <button onClick={goToNextMonth} disabled={!canGoNext} className="btn-icon" style={{ opacity: canGoNext ? 1 : 0.3 }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>

            <div className="card">
                <div className="calendar-grid mb-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => <div key={i} className="calendar-header">{day}</div>)}
                </div>
                <div className="calendar-grid">
                    {days.map((dateStr, index) => {
                        if (!dateStr) return <div key={`empty-${index}`} className="calendar-day" style={{ visibility: 'hidden' }} />;
                        const entry = entries[dateStr];
                        const isTodays = dateStr === today;
                        const isFuture = isFutureDate(dateStr);
                        const dayNum = DateTime.fromISO(dateStr).day;

                        let className = 'calendar-day';
                        if (isTodays) className += ' today';
                        else if (isFuture) className += ' future';
                        else if (entry?.completed) className += ' completed';

                        const handleClick = () => {
                            if (!isFuture && entry) {
                                setSelectedDate(dateStr);
                            }
                        };

                        return (
                            <div
                                key={dateStr}
                                className={`${className} ${!isFuture && entry ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
                                onClick={handleClick}
                            >
                                {dayNum}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="card mt-4">
                <p className="card-title mb-3">Legend</p>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)' }} />
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Today</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-[rgba(34,197,94,0.15)] border border-[rgba(34,197,94,0.3)]" />
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Completed</span>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {selectedDate && (
                    <DayViewModal
                        date={selectedDate}
                        entry={entries[selectedDate]}
                        onClose={() => setSelectedDate(null)}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default Calendar;
