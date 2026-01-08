import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useDiary } from '../App';
import { getStreakStats, generateHeatMapData, getMilestoneProgress, getRotatedDayHeaders } from '../utils/streakUtils';
import { DateTime } from 'luxon';
import Header from '../components/Header';
import { s3Client } from '../storj';
import { HeadObjectCommand } from '@aws-sdk/client-s3';

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

const Stats = () => {
    const { entries, currentStreak, saveEntry, bucketName } = useDiary(); // Get bucketName
    const isShitDiary = bucketName === 'mudit-diary';
    const stats = useMemo(() => getStreakStats(entries), [entries]);
    const heatMapData = useMemo(() => generateHeatMapData(entries, 8), [entries]);
    const milestoneProgress = useMemo(() => getMilestoneProgress(currentStreak), [currentStreak]);
    const dayHeaders = useMemo(() => getRotatedDayHeaders(), []);

    // Sync state
    const [isSyncing, setIsSyncing] = React.useState(false);

    // Identify missing data
    const missingDurationCount = useMemo(() =>
        Object.values(entries).filter(e => e.audioUrl && !e.audioDuration).length
        , [entries]);

    const missingPhotoSizeCount = useMemo(() =>
        Object.values(entries).reduce((acc, e) => acc + (e.photos?.filter(p => !p.size).length || 0), 0)
        , [entries]);

    const handleSyncAllStats = async () => {
        setIsSyncing(true);
        const bucket = bucketName; // Use dynamic bucket

        try {
            // 1. Sync Audio Duration
            const missingAudioEntries = Object.entries(entries).filter(([_, e]) => e.audioUrl && !e.audioDuration);
            for (const [date, entry] of missingAudioEntries) {
                await new Promise((resolve) => {
                    const audio = new Audio(entry.audioUrl);
                    audio.onloadedmetadata = async () => {
                        const duration = Math.round(audio.duration);
                        await saveEntry(date, { ...entry, audioDuration: duration });
                        resolve();
                    };
                    audio.onerror = resolve;
                });
            }

            // 2. Sync Photo Sizes
            const entriesWithMissingPhotos = Object.entries(entries).filter(([_, e]) => e.photos?.some(p => !p.size));
            for (const [date, entry] of entriesWithMissingPhotos) {
                const newPhotos = await Promise.all(entry.photos.map(async (p) => {
                    if (p.size) return p;
                    try {
                        let key = p.url;
                        // Extract Key if it is a full URL
                        if (key.startsWith('http')) {
                            // Try to split by bucket name
                            const bucketPart = `/${bucket}/`;
                            if (key.includes(bucketPart)) {
                                key = key.split(bucketPart)[1].split('?')[0]; // Remove query params if any
                            } else {
                                // Fallback: try to guess standard Storj/S3 format (last parts)
                                // This is risky if we don't know the structure, but usually safe for "photos/..."
                                const parts = key.split('/');
                                const photoIndex = parts.indexOf('photos');
                                if (photoIndex !== -1) {
                                    key = parts.slice(photoIndex).join('/').split('?')[0];
                                } else {
                                    // If we can't determine key, skip
                                    console.warn("Could not extract key from URL:", key);
                                    return p;
                                }
                            }
                        }

                        // Decode URI components in case spaces/special chars are encoded
                        key = decodeURIComponent(key);

                        const command = new HeadObjectCommand({
                            Bucket: bucket,
                            Key: key
                        });
                        const response = await s3Client.send(command);
                        return { ...p, size: response.ContentLength };
                    } catch (err) {
                        console.warn("Failed to fetch size for", p.url, err);
                        return p;
                    }
                }));

                // Update entry
                await saveEntry(date, { ...entry, photos: newPhotos });
            }

        } catch (e) {
            console.error("Sync failed", e);
        } finally {
            setIsSyncing(false);
        }
    };

    // 1. Mood Trends (Last 30 Days)
    const moodTrendData = useMemo(() => {
        const data = [];
        const today = DateTime.now();
        for (let i = 29; i >= 0; i--) {
            const date = today.minus({ days: i }).toISODate();
            const entry = entries[date];
            const rawMood = entry?.mood;
            const value = rawMood ? (6 - rawMood) : null;
            data.push({ date: DateTime.fromISO(date).toFormat('dd/MM'), value, rawMood });
        }
        return data;
    }, [entries]);

    // 2. Writing Volume
    const writingVolumeData = useMemo(() => {
        const data = [];
        const today = DateTime.now();
        for (let i = 13; i >= 0; i--) {
            const date = today.minus({ days: i }).toISODate();
            const entry = entries[date];
            const charCount = entry?.journal ? entry.journal.length : 0;
            data.push({ date: DateTime.fromISO(date).toFormat('dd/MM'), chars: charCount });
        }
        return data;
    }, [entries]);

    // ... (rest of stats logic) ...

    const voiceStats = useMemo(() => {
        let count = 0;
        let totalDuration = 0;
        Object.values(entries).forEach(e => {
            if (e.audioUrl) {
                count++;
                if (e.audioDuration) totalDuration += e.audioDuration;
            }
        });
        const avgDuration = count > 0 ? Math.round(totalDuration / count) : 0;
        return { count, totalDuration, avgDuration };
    }, [entries]);

    // 4. Avg Characters
    const avgCharacters = useMemo(() => {
        const startDate = '2026-01-01';
        const today = DateTime.now().toISODate();
        let totalChars = 0;
        let daysWithJournal = 0;
        Object.entries(entries).forEach(([date, entry]) => {
            if (date >= startDate && date <= today) {
                const chars = entry?.journal?.length || 0;
                if (chars > 0) {
                    totalChars += chars;
                    daysWithJournal++;
                }
            }
        });
        return daysWithJournal > 0 ? Math.round(totalChars / daysWithJournal) : 0;
    }, [entries]);

    // 5. Voice Duration Data (last 14 days - for graph)
    const voiceDurationData = useMemo(() => {
        const data = [];
        const today = DateTime.now();
        for (let i = 13; i >= 0; i--) {
            const date = today.minus({ days: i }).toISODate();
            const entry = entries[date];
            const duration = entry?.audioDuration || 0;
            data.push({ date: DateTime.fromISO(date).toFormat('dd/MM'), duration });
        }
        return data;
    }, [entries]);

    // Helper: format duration (seconds to mm:ss)
    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const moodData = useMemo(() => {
        const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        Object.values(entries).forEach((entry) => { if (entry.mood) counts[entry.mood]++; });
        return MOOD_CONFIG.map((m) => ({ ...m, count: counts[m.value] })).filter((m) => m.count > 0);
    }, [entries]);

    const photoStats = useMemo(() => {
        let count = 0;
        let totalSize = 0;
        Object.values(entries).forEach(e => {
            if (e.photos && e.photos.length > 0) {
                count += e.photos.length;
                e.photos.forEach(p => {
                    if (p.size) totalSize += p.size;
                });
            }
        });
        return { count, totalSize };
    }, [entries]);

    const formatSize = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const statItems = [
        { icon: STAT_ICONS.current, value: stats.currentStreak, label: 'Current Streak', sub: 'days' },
        { icon: STAT_ICONS.best, value: stats.longestStreak, label: 'Longest Streak', sub: 'days' },
        { icon: STAT_ICONS.total, value: stats.totalDays, label: 'Total Entries', sub: 'entries' },
        { icon: STAT_ICONS.rate, value: `${stats.completionRate}%`, label: 'Consistency', sub: 'last 30 days' },
    ];

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="page">
            <Header title="Stats" />

            {/* Sync Banner */}
            {!isShitDiary && (missingDurationCount > 0 || missingPhotoSizeCount > 0) && (
                <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-orange-500 font-semibold">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        <span>Data Sync Required</span>
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">
                        {missingDurationCount > 0 && <span>• {missingDurationCount} voice logs missing duration<br /></span>}
                        {missingPhotoSizeCount > 0 && <span>• {missingPhotoSizeCount} photos missing size info</span>}
                    </p>
                    <button
                        onClick={handleSyncAllStats}
                        disabled={isSyncing}
                        className="self-start px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-2 mt-1"
                    >
                        {isSyncing ? (
                            <>
                                <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Syncing Metadata...
                            </>
                        ) : 'Sync All Data'}
                    </button>
                </div>
            )}

            {/* Core Stats Grid (rest identical) */}
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
                                    <stop offset="5%" stopColor={isShitDiary ? "#f97316" : "#8b5cf6"} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={isShitDiary ? "#f97316" : "#8b5cf6"} stopOpacity={0} />
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
                            <Area type="monotone" dataKey="chars" stroke={isShitDiary ? "#f97316" : "#8b5cf6"} fillOpacity={1} fill="url(#colorChars)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Voice Duration Chart */}
            {
                !isShitDiary && (
                    <div className="card mb-6">
                        <h3 className="card-title mb-4">Voice Duration (Seconds)</h3>
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={voiceDurationData}>
                                    <defs>
                                        <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                    <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} interval={2} />
                                    <YAxis hide />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                        itemStyle={{ color: 'var(--text)' }}
                                        labelStyle={{ color: 'var(--text-muted)' }}
                                        formatter={(value) => [formatDuration(value), 'Duration']}
                                    />
                                    <Area type="monotone" dataKey="duration" stroke="#06b6d4" fillOpacity={1} fill="url(#colorDuration)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )
            }

            {/* Photo Stats Row */}
            {
                !isShitDiary && (
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="card flex flex-col items-center justify-center py-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-500/10 blur-2xl pointer-events-none" />
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-yellow-500/20 text-yellow-400 mb-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L16 16" /></svg>
                            </div>
                            <div className="text-2xl font-bold text-gradient mb-1">{photoStats.count}</div>
                            <div className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Total Memories</div>
                        </div>

                        <div className="card flex flex-col items-center justify-center py-4 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-16 h-16 bg-blue-500/10 blur-2xl pointer-events-none" />
                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500/20 text-blue-400 mb-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            </div>
                            <div className="text-2xl font-bold text-gradient mb-1">{formatSize(photoStats.totalSize)}</div>
                            <div className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Storage Used</div>
                        </div>
                    </div>
                )
            }

            {/* Quick Stats Row (Voice & Text) */}
            <div className={`grid gap-3 mb-6 ${isShitDiary ? 'grid-cols-1' : 'grid-cols-4'}`}>
                {/* Recordings */}
                {!isShitDiary && (
                    <div className="card flex flex-col items-center justify-center py-4">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-500/20 text-purple-400 mb-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        </div>
                        <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>{voiceStats.count}</div>
                        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Recordings</div>
                    </div>
                )}

                {/* Total Time */}
                {!isShitDiary && (
                    <div className="card flex flex-col items-center justify-center py-4">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-500/20 text-blue-400 mb-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>{formatDuration(voiceStats.totalDuration)}</div>
                        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Total Time</div>
                    </div>
                )}

                {/* Avg Duration */}
                {!isShitDiary && (
                    <div className="card flex flex-col items-center justify-center py-4">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-cyan-500/20 text-cyan-400 mb-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>{formatDuration(voiceStats.avgDuration)}</div>
                        <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Avg Duration</div>
                    </div>
                )}

                {/* Avg Characters */}
                <div className="card flex flex-col items-center justify-center py-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${isShitDiary ? 'bg-orange-500/20 text-orange-400' : 'bg-pink-500/20 text-pink-400'}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </div>
                    <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>{avgCharacters.toLocaleString()}</div>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Avg Chars</div>
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
