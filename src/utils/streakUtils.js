import { DateTime } from 'luxon';

const IST_ZONE = 'Asia/Kolkata';

// Milestone thresholds and their labels
export const MILESTONES = [
    { days: 7, label: '1 Week', emoji: '🔥', color: '#f97316' },
    { days: 14, label: '2 Weeks', emoji: '⭐', color: '#eab308' },
    { days: 30, label: '1 Month', emoji: '🏆', color: '#22c55e' },
    { days: 60, label: '2 Months', emoji: '💎', color: '#06b6d4' },
    { days: 100, label: '100 Days', emoji: '🎯', color: '#8b5cf6' },
    { days: 365, label: '1 Year', emoji: '👑', color: '#ec4899' },
];

/**
 * Calculate current streak from entries
 * @param {Object} entries - Object with date keys (YYYY-MM-DD)
 * @returns {number} Current streak count
 */
export const calculateCurrentStreak = (entries) => {
    if (!entries || Object.keys(entries).length === 0) return 0;

    const today = DateTime.now().setZone(IST_ZONE).startOf('day');
    let streak = 0;
    let checkDate = today;

    // Check if today has an entry or if yesterday has one
    const todayStr = today.toFormat('yyyy-MM-dd');
    const yesterdayStr = today.minus({ days: 1 }).toFormat('yyyy-MM-dd');

    // Start from today if there's a COMPLETED entry. 
    // If today is incomplete/missing, start from yesterday if THAT is completed.
    // Otherwise, streak is 0.
    // Check if today has an entry (completed OR has mood/journal)
    const isCompleted = (entry) => entry && (entry.completed || entry.mood || (entry.journal && entry.journal.length > 0));

    // Start from today if there's a COMPLETED entry. 
    // If today is incomplete/missing, start from yesterday if THAT is completed.
    // Otherwise, streak is 0.
    if (isCompleted(entries[todayStr])) {
        checkDate = today;
    } else if (isCompleted(entries[yesterdayStr])) {
        checkDate = today.minus({ days: 1 });
    } else {
        return 0;
    }

    // Count consecutive days backwards
    while (true) {
        const dateStr = checkDate.toFormat('yyyy-MM-dd');
        // Redefine check locally if needed or reuse logic
        const entry = entries[dateStr];
        if (entry && (entry.completed || entry.mood || (entry.journal && entry.journal.length > 0))) {
            streak++;
            checkDate = checkDate.minus({ days: 1 });
        } else {
            break;
        }
    }

    return streak;
};

/**
 * Calculate longest streak from all entries
 * @param {Object} entries - Object with date keys
 * @returns {number} Longest streak count
 */
export const calculateLongestStreak = (entries) => {
    if (!entries || Object.keys(entries).length === 0) return 0;

    const dates = Object.keys(entries)
        .filter(date => {
            const e = entries[date];
            return e && (e.completed || e.mood || (e.journal && e.journal.length > 0));
        })
        .sort();

    if (dates.length === 0) return 0;

    let longestStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < dates.length; i++) {
        const prevDate = DateTime.fromISO(dates[i - 1], { zone: IST_ZONE });
        const currDate = DateTime.fromISO(dates[i], { zone: IST_ZONE });
        const diff = currDate.diff(prevDate, 'days').days;

        if (diff === 1) {
            currentStreak++;
            longestStreak = Math.max(longestStreak, currentStreak);
        } else {
            currentStreak = 1;
        }
    }

    return longestStreak;
};

/**
 * Check if a milestone was just reached
 * @param {number} streak - Current streak count
 * @returns {Object|null} Milestone object or null
 */
export const checkMilestone = (streak) => {
    return MILESTONES.find(m => m.days === streak) || null;
};

/**
 * Get the next milestone to reach
 * @param {number} streak - Current streak count
 * @returns {Object|null} Next milestone object
 */
export const getNextMilestone = (streak) => {
    return MILESTONES.find(m => m.days > streak) || null;
};

/**
 * Calculate progress to next milestone
 * @param {number} streak - Current streak count
 * @returns {Object} Progress info
 */
export const getMilestoneProgress = (streak) => {
    const currentMilestone = [...MILESTONES].reverse().find(m => m.days <= streak);
    const nextMilestone = getNextMilestone(streak);

    if (!nextMilestone) {
        return {
            current: currentMilestone,
            next: null,
            progress: 100,
            daysRemaining: 0
        };
    }

    const startDays = currentMilestone ? currentMilestone.days : 0;
    const totalDays = nextMilestone.days - startDays;
    const progressDays = streak - startDays;
    const progress = Math.round((progressDays / totalDays) * 100);

    return {
        current: currentMilestone,
        next: nextMilestone,
        progress,
        daysRemaining: nextMilestone.days - streak
    };
};

/**
 * Generate heat map data for the last N weeks
 * Data fills completely - today is always the last cell
 * @param {Object} entries - Object with date keys
 * @param {number} weeks - Number of weeks to include
 * @returns {Array} Heat map data
 */
export const generateHeatMapData = (entries, weeks = 12) => {
    const today = DateTime.now().setZone(IST_ZONE).startOf('day');
    const data = [];
    const totalDays = weeks * 7;

    // Go back totalDays-1, so today is the LAST cell
    for (let i = totalDays - 1; i >= 0; i--) {
        const date = today.minus({ days: i });
        const dateStr = date.toFormat('yyyy-MM-dd');
        const entry = entries?.[dateStr];

        data.push({
            date: dateStr,
            day: date.weekday, // 1=Mon, 7=Sun
            hasEntry: !!(entry && (entry.completed || entry.mood || (entry.journal && entry.journal.length > 0))),
            mood: entry?.mood || null,
            weekLabel: date.toFormat('MMM d')
        });
    }

    return data;
};

/**
 * Get rotated day headers so that "today" aligns with the last cell
 * @returns {Array} Array of single-letter day headers
 */
export const getRotatedDayHeaders = () => {
    const today = DateTime.now().setZone(IST_ZONE);
    const todayWeekday = today.weekday; // 1=Mon, 7=Sun

    // Full week starting from Monday
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']; // Mon to Sun

    // We want the header to start from the day AFTER today
    // So if today is Monday (1), we rotate to start from Tuesday (index 1)
    const startIndex = todayWeekday % 7; // Tomorrow's index (0-6)

    const rotated = [...days.slice(startIndex), ...days.slice(0, startIndex)];
    return rotated;
};

/**
 * Get streak statistics
 * @param {Object} entries - Object with date keys
 * @returns {Object} Statistics object
 */
export const getStreakStats = (entries) => {
    const isCompleted = (e) => e && (e.completed || e.mood || (e.journal && e.journal.length > 0));
    const dates = Object.keys(entries || {}).filter(date => isCompleted(entries[date]));
    const totalDays = dates.length;
    const currentStreak = calculateCurrentStreak(entries);
    const longestStreak = calculateLongestStreak(entries);
    const milestoneProgress = getMilestoneProgress(currentStreak);

    // Calculate completion rate for last 30 days
    const today = DateTime.now().setZone(IST_ZONE).startOf('day');
    let completedLast30 = 0;
    for (let i = 0; i < 30; i++) {
        const dateStr = today.minus({ days: i }).toFormat('yyyy-MM-dd');
        if (isCompleted(entries?.[dateStr])) {
            completedLast30++;
        }
    }
    const completionRate = Math.round((completedLast30 / 30) * 100);

    return {
        totalDays,
        currentStreak,
        longestStreak,
        completionRate,
        milestoneProgress
    };
};
