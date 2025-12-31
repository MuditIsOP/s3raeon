import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDiary } from '../App';
import { getTodayIST, formatDate, getCurrentMonthYear, getDaysInMonth, isMorningTime, isEveningTime } from '../utils/timeUtils';
import { getCachedProfile, loadProfile } from '../profile';
import { DateTime } from 'luxon';
import Header from '../components/Header';
import MorningSection from '../components/MorningSection';
import PhotoSection from '../components/PhotoSection';
import EveningSection from '../components/EveningSection';
import OnThisDay from '../components/OnThisDay';

function Home() {
    const { todayEntry, entries } = useDiary();
    const today = getTodayIST();
    const currentMonth = getCurrentMonthYear();
    const [profile, setProfile] = useState(getCachedProfile());

    useEffect(() => {
        loadProfile().then(setProfile);
    }, []);

    const [viewMonth, setViewMonth] = useState(currentMonth.month);
    const [viewYear, setViewYear] = useState(currentMonth.year);

    const days = getDaysInMonth(viewYear, viewMonth);
    const monthLabel = DateTime.fromObject({ year: viewYear, month: viewMonth }).toFormat('MMMM yyyy');
    const dayName = formatDate(today, 'EEE');
    const dateDisplay = formatDate(today, 'MMM d');

    const goToPrevMonth = () => {
        if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1); }
        else { setViewMonth(viewMonth - 1); }
    };

    const goToNextMonth = () => {
        if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1); }
        else { setViewMonth(viewMonth + 1); }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="page">
            <Header showStreak={true} />

            <div className="mb-6">
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.25rem', fontWeight: 500, color: 'var(--text)' }}>Hi, {profile.firstName}</h1>
                <p className="text-date">
                    {dayName} · {dateDisplay}
                </p>
            </div>

            <div className="space-y-4">
                <OnThisDay entries={entries} />
                <MorningSection todayEntry={todayEntry} isUnlocked={isMorningTime()} />
                <PhotoSection todayEntry={todayEntry} />
                <EveningSection todayEntry={todayEntry} isUnlocked={isEveningTime()} />

                <section className="card">
                    <div className="card-header">
                        <h2 className="card-title">This Month</h2>
                        <div className="flex items-center gap-1">
                            <button onClick={goToPrevMonth} className="btn-icon" style={{ width: '1.75rem', height: '1.75rem' }}>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button onClick={goToNextMonth} className="btn-icon" style={{ width: '1.75rem', height: '1.75rem' }}>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <p className="text-label mb-3">{monthLabel}</p>

                    <div className="calendar-grid mb-1">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                            <div key={i} className="calendar-header">{day}</div>
                        ))}
                    </div>

                    <div className="calendar-grid">
                        {days.map((dateStr, index) => {
                            if (!dateStr) return <div key={`empty-${index}`} className="calendar-day" style={{ visibility: 'hidden' }} />;
                            const entry = entries[dateStr];
                            const isTodays = dateStr === today;
                            const isFuture = DateTime.fromISO(dateStr) > DateTime.now();
                            const dayNum = DateTime.fromISO(dateStr).day;

                            let className = 'calendar-day';
                            if (isTodays) className += ' today';
                            else if (entry?.completed) className += ' completed';
                            else if (isFuture) className += ' future';

                            return <div key={dateStr} className={className}>{dayNum}</div>;
                        })}
                    </div>
                </section>
            </div>
        </motion.div>
    );
}

export default Home;
