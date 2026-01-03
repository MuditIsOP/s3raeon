import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useDiary } from '../App';
import { getStreakStats, generateHeatMapData, getMilestoneProgress } from '../utils/streakUtils';
import Header from '../components/Header';

const MOOD_CONFIG = [
    { value: 1, label: 'Great', color: '#22c55e' },
    { value: 2, label: 'Good', color: '#84cc16' },
    { value: 3, label: 'Okay', color: '#eab308' },
    { value: 4, label: 'Low', color: '#f97316' },
    { value: 5, label: 'Hard', color: '#ef4444' },
];

const STAT_ICONS = {
    current: <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>,
    best: <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z" /></svg>,
    total: <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
    rate: <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
};

function Stats() {
    const { entries, currentStreak } = useDiary();
    const stats = useMemo(() => getStreakStats(entries), [entries]);
    const heatMapData = useMemo(() => generateHeatMapData(entries, 8), [entries]);
    const milestoneProgress = useMemo(() => getMilestoneProgress(currentStreak), [currentStreak]);

    const moodData = useMemo(() => {
        const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        Object.values(entries).forEach((entry) => { if (entry.mood) counts[entry.mood]++; });
        return MOOD_CONFIG.map((m) => ({ ...m, count: counts[m.value] })).filter((m) => m.count > 0);
    }, [entries]);

    const statItems = [
        { icon: STAT_ICONS.current, value: stats.currentStreak, label: 'Current Streak', sub: 'days' },
        { icon: STAT_ICONS.best, value: stats.longestStreak, label: 'Longest Streak', sub: 'days' },
        { icon: STAT_ICONS.total, value: stats.totalDays, label: 'Total Entries', sub: 'entries' },
        { icon: STAT_ICONS.rate, value: `${stats.completionRate}%`, label: 'Consistency', sub: 'last 30 days' },
    ];

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="page">
            <Header title="Stats" />

            <div className="grid grid-cols-2 gap-3 mb-6">
                {statItems.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="card flex flex-col items-center justify-center py-6"
                    >
                        <div className="text-[var(--primary)]">{stat.icon}</div>
                        <div className="text-2xl font-bold text-gradient mb-1">{stat.value}</div>
                        <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{stat.label}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.sub}</div>
                    </motion.div>
                ))}
            </div>

            {milestoneProgress.next && (
                <div className="card mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="card-title">Next Milestone</h3>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{milestoneProgress.next.label}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-lg" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)' }}>
                            {milestoneProgress.next.days}
                        </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'var(--bg-elevated)' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${milestoneProgress.progress}%` }} transition={{ delay: 0.3, duration: 0.6 }} className="h-full rounded-full" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)' }} />
                    </div>
                    <div className="flex justify-between text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                        <span>{milestoneProgress.current} days</span>
                        <span>{milestoneProgress.daysRemaining} to go</span>
                    </div>
                </div>
            )}

            <div className="card mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="card-title">Activity Levels</h3>
                    <div className="flex gap-2">
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-[var(--primary)]"></div><span className="text-xs text-[var(--text-muted)]">Entry</span></div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-[var(--bg-elevated)]"></div><span className="text-xs text-[var(--text-muted)]">None</span></div>
                    </div>
                </div>
                <div className="grid grid-cols-7 gap-1.5 mb-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                        <div key={i} className="text-[10px] text-center font-bold opacity-40" style={{ color: 'var(--text)' }}>{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                    {/* Padding for start alignment */}
                    {heatMapData.length > 0 && Array.from({ length: (heatMapData[0].day === 7 ? 0 : heatMapData[0].day) }).map((_, i) => (
                        <div key={`pad-${i}`} />
                    ))}
                    {heatMapData.map((day) => (
                        <div key={day.date} className="aspect-square rounded-md transition-all hover:scale-110" style={{ backgroundColor: day.hasEntry && day.mood ? MOOD_CONFIG.find((m) => m.value === day.mood)?.color : day.hasEntry ? 'var(--primary)' : 'var(--bg-elevated)' }} title={day.date} />
                    ))}
                </div>
            </div>

            {
                moodData.length > 0 && (
                    <div className="card">
                        <h3 className="card-title mb-4">Mood Breakdown</h3>
                        <div className="flex items-center justify-center" style={{ height: '160px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={moodData} dataKey="count" cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4}>
                                        {moodData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--card-bg)" strokeWidth={2} />)}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap justify-center gap-4 mt-4">
                            {moodData.map((m) => (
                                <div key={m.value} className="flex items-center gap-1.5 bg-[var(--bg-elevated)] px-2 py-1 rounded-lg">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                                    <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>{m.label} ({m.count})</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }
        </motion.div >
    );
}

export default Stats;
