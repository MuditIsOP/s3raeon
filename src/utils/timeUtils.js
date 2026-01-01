import { DateTime } from 'luxon';

// IST timezone
const IST_ZONE = 'Asia/Kolkata';

/**
 * Get current time in IST
 */
export const getCurrentIST = () => {
    return DateTime.now().setZone(IST_ZONE);
};

/**
 * Get today's date string in IST (YYYY-MM-DD format)
 */
export const getTodayIST = () => {
    return getCurrentIST().toFormat('yyyy-MM-dd');
};

/**
 * Get current hour in IST (0-23)
 */
export const getCurrentHourIST = () => {
    return getCurrentIST().hour;
};

/**
 * Check if current time is within morning window (5 AM - 10 AM IST)
 */
export const isMorningTime = () => {
    const hour = getCurrentHourIST();
    return hour >= 5 && hour < 13;
};

/**
 * Check if current time is within evening window (8 PM - 12 AM IST)
 */
export const isEveningTime = () => {
    const hour = getCurrentHourIST();
    return hour >= 20; // 8 PM to 11:59 PM
};

/**
 * Check if a date is today
 */
export const isToday = (dateString) => {
    return dateString === getTodayIST();
};

/**
 * Check if a date is in the past (no backdating allowed)
 */
export const isPastDate = (dateString) => {
    const date = DateTime.fromISO(dateString, { zone: IST_ZONE });
    const today = getCurrentIST().startOf('day');
    return date < today;
};

/**
 * Check if a date is in the future
 */
export const isFutureDate = (dateString) => {
    const date = DateTime.fromISO(dateString, { zone: IST_ZONE });
    const today = getCurrentIST().startOf('day');
    return date > today;
};

/**
 * Get the day of month (1-31)
 */
export const getDayOfMonth = (dateString = null) => {
    if (dateString) {
        return DateTime.fromISO(dateString, { zone: IST_ZONE }).day;
    }
    return getCurrentIST().day;
};

/**
 * Get the month-day string (MM-DD format for special dates)
 */
export const getMonthDay = (dateString = null) => {
    if (dateString) {
        return DateTime.fromISO(dateString, { zone: IST_ZONE }).toFormat('MM-dd');
    }
    return getCurrentIST().toFormat('MM-dd');
};

/**
 * Format date for display
 */
export const formatDate = (dateString, format = 'MMMM d, yyyy') => {
    return DateTime.fromISO(dateString, { zone: IST_ZONE }).toFormat(format);
};

/**
 * Format relative date (e.g., "Today", "Yesterday", "3 days ago")
 */
export const formatRelativeDate = (dateString) => {
    const date = DateTime.fromISO(dateString, { zone: IST_ZONE });
    const today = getCurrentIST().startOf('day');
    const diff = today.diff(date.startOf('day'), 'days').days;

    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${Math.floor(diff)} days ago`;
    if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
    return date.toFormat('MMM d, yyyy');
};

/**
 * Get time remaining until morning window opens
 */
export const getTimeUntilMorning = () => {
    const now = getCurrentIST();
    let nextMorning = now.set({ hour: 5, minute: 0, second: 0 });

    if (now.hour >= 10) {
        // After morning, get tomorrow's morning
        nextMorning = nextMorning.plus({ days: 1 });
    } else if (now.hour >= 5) {
        // Currently in morning window
        return null;
    }

    const diff = nextMorning.diff(now, ['hours', 'minutes']);
    return {
        hours: Math.floor(diff.hours),
        minutes: Math.floor(diff.minutes % 60)
    };
};

/**
 * Get time remaining until evening window opens
 */
export const getTimeUntilEvening = () => {
    const now = getCurrentIST();
    let nextEvening = now.set({ hour: 20, minute: 0, second: 0 });

    if (now.hour >= 20 || now.hour < 0) {
        // Currently in evening window
        return null;
    }

    const diff = nextEvening.diff(now, ['hours', 'minutes']);
    return {
        hours: Math.floor(diff.hours),
        minutes: Math.floor(diff.minutes % 60)
    };
};

/**
 * Get the current month and year
 */
export const getCurrentMonthYear = () => {
    const now = getCurrentIST();
    return {
        month: now.month,
        year: now.year,
        monthName: now.toFormat('MMMM'),
        formatted: now.toFormat('MMMM yyyy')
    };
};

/**
 * Get all days in a month (Sunday-first calendar)
 */
export const getDaysInMonth = (year, month) => {
    const startOfMonth = DateTime.fromObject({ year, month, day: 1 }, { zone: IST_ZONE });
    const daysInMonth = startOfMonth.daysInMonth;
    // Luxon weekday: 1=Monday, 7=Sunday
    // Convert to Sunday-first: Sunday=0, Monday=1, ..., Saturday=6
    const firstDayOfWeek = startOfMonth.weekday % 7; // 7 (Sunday) becomes 0

    const days = [];

    // Add empty cells for days before the 1st
    for (let i = 0; i < firstDayOfWeek; i++) {
        days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        days.push(DateTime.fromObject({ year, month, day }, { zone: IST_ZONE }).toFormat('yyyy-MM-dd'));
    }

    return days;
};

/**
 * Check if date exists in past years (for "On This Day" feature)
 */
export const getOnThisDayDates = () => {
    const now = getCurrentIST();
    const currentDay = now.day;

    const pastDates = [];

    // Look back 12 months
    for (let i = 1; i <= 12; i++) {
        const pastDate = now.minus({ months: i });

        // Handle end of month edge cases (e.g. current is 31st, past month has 30 days)
        // Luxon handles this by clamping to the last day of the month usually, but let's verify.
        // If today is 31st, minus 1 month from Jan 31 gives Dec 31.
        // If today is 31st March, minus 1 month gives Feb 28/29.
        // We only want to show if the day matches exactly or maybe standard "same day" logic is fine.
        // User said "dates of the previous months".

        // We will stick to exact date matches if possible, but Luxon's default behavior 
        // for minus months is to pin to month end if day doesn't exist.
        // e.g. Mar 31 -> Feb 28. This is acceptable for "One month ago".

        pastDates.push(pastDate.toFormat('yyyy-MM-dd'));
    }

    return pastDates;
};
