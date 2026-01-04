import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useDiary } from '../App';
import { getStreakStats, generateHeatMapData, getMilestoneProgress, getRotatedDayHeaders } from '../utils/streakUtils';
import { DateTime } from 'luxon';
import Header from '../components/Header';

const MOOD_CONFIG = [
    { value: 1, label: 'Great', color: '#22c55e' },
    { value: 2, label: 'Good', color: '#84cc16' },
    { value: 3, label: 'Okay', color: '#eab308' },
    { value: 4, label: 'Low', color: '#f97316' },
    { value: 5, label: 'Hard', color: '#ef4444' },
];

const STOP_WORDS = new Set(['the', 'and', 'to', 'of', 'a', 'in', 'i', 'is', 'that', 'it', 'for', 'you', 'was', 'with', 'on', 'as', 'have', 'but', 'be', 'they', 'at', 'this', 'my', 'had', 'not', 'are', 'from', 'or', 'so', 'me', 'day', 'today', 'im', 'very', 'just', 'like', 'felt', 'feel']);

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
    const dayHeaders = useMemo(() => getRotatedDayHeaders(), []);

    // 1. Mood Trends (Last 30 Days)
    const moodTrendData = useMemo(() => {
        const data = [];
        const today = DateTime.now();
        for (let i = 29; i >= 0; i--) {
            const date = today.minus({ days: i }).toISODate();
            const entry = entries[date];
            // Invert mood value for chart logic (1=Great should be high, 5=Hard should be low)
            // Or keep 1-5 and fix axis. Let's map 1->5, 2->4, 3->3, 4->2, 5->1 for visual "Up is Good"
            const rawMood = entry?.mood;
            const value = rawMood ? (6 - rawMood) : null;
            data.push({ date: DateTime.fromISO(date).toFormat('dd/MM'), value, rawMood });
        }
        return data;
    }, [entries]);

    // 2. Writing Volume (Last 14 Days) - Journal Only
    const writingVolumeData = useMemo(() => {
        const data = [];
        const today = DateTime.now();
        for (let i = 13; i >= 0; i--) { // Last 14 days
            const date = today.minus({ days: i }).toISODate();
            const entry = entries[date];
            // Only count actual journal text provided by user. 
            // Exclude affirmation as it might be pre-filled or not "expressive writing".
            const charCount = entry?.journal ? entry.journal.length : 0;
            data.push({ date: DateTime.fromISO(date).toFormat('dd/MM'), chars: charCount });
        }
        return data;
    }, [entries]);

    // 3. Voice Stats
    const voiceStats = useMemo(() => {
        let count = 0;
        Object.values(entries).forEach(e => { if (e.audioUrl) count++; });
        return { count };
    }, [entries]);

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

            {/* Core Stats Grid */}
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

            {/* Mood Trends Chart */}
            <div className="card mb-6">
                <h3 className="card-title mb-4">Mood Trends (30 Days)</h3>
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={moodTrendData}>
                            <defs>
                                <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} interval={6} />
                            <YAxis domain={[1, 5]} hide />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                itemStyle={{ color: 'var(--text)' }}
                                labelStyle={{ color: 'var(--text-muted)' }}
                                formatter={(value) => [MOOD_CONFIG.find(m => (6 - value) === m.value)?.label || 'Unknown', 'Mood']}
                            />
                            <Area type="monotone" dataKey="value" stroke="var(--primary)" fillOpacity={1} fill="url(#colorMood)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Writing Volume Chart */}
            <div className="card mb-6">
                <h3 className="card-title mb-4">Writing Volume (Characters)</h3>
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={writingVolumeData}>
                            <defs>
                                <linearGradient id="colorChars" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} interval={2} />
                            <YAxis hide />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                itemStyle={{ color: 'var(--text)' }}
                                labelStyle={{ color: 'var(--text-muted)' }}
                                formatter={(value) => [value, 'Characters']}
                            />
                            <Area type="monotone" dataKey="chars" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorChars)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Voice Summary Card */}
            <div className="card mb-6 flex items-center justify-between">
                <div>
                    <h3 className="card-title">Voice Memories</h3>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total recordings saved</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-purple-500/20 text-purple-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    </div>
                    <span className="text-2xl font-bold">{voiceStats.count}</span>
                </div>
            </div>

            {/* Activity Heatmap */}
            <div className="card mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="card-title">Activity Levels</h3>
                    <div className="flex gap-2">
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-[var(--primary)]"></div><span className="text-xs text-[var(--text-muted)]">Entry</span></div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-[var(--bg-elevated)]"></div><span className="text-xs text-[var(--text-muted)]">None</span></div>
                    </div>
                </div>
                <div className="grid grid-cols-7 gap-1.5 mb-2">
                    {dayHeaders.map((d, i) => (
                        <div key={i} className="text-[10px] text-center font-bold opacity-40" style={{ color: 'var(--text)' }}>{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                    {heatMapData.map((day) => (
                        <div key={day.date} className="aspect-square rounded-md transition-all hover:scale-110" style={{ backgroundColor: day.hasEntry && day.mood ? MOOD_CONFIG.find((m) => m.value === day.mood)?.color : day.hasEntry ? 'var(--primary)' : 'var(--bg-elevated)' }} title={day.date} />
                    ))}
                </div>
            </div>

            {/* Mood Breakdown Pie */}
            {moodData.length > 0 && (
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
            )}
        </motion.div >
    );
}

export default Stats;
