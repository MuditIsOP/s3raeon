import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

// Helper component to handle initial redirects
function RedirectHandler({ to, setRedirect }) {
    const navigate = useNavigate();
    useEffect(() => {
        if (to) {
            navigate(to);
            setRedirect(null);
        }
    }, [to, navigate, setRedirect]);
    return null;
}
import { getTodayIST } from './utils/timeUtils';
import { calculateCurrentStreak, checkMilestone } from './utils/streakUtils';
import { loadEntries, saveEntry as storjSaveEntry, BUCKET_NAME, syncAllMedia } from './storj';

import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import Stats from './pages/Stats';
import More from './pages/More';
import Calendar from './pages/Calendar';
import Profile from './pages/Profile';
import MilestonePopup from './components/MilestonePopup';
import TermsModal from './components/TermsModal';
import GuidelinesModal from './components/GuidelinesModal';
import UpdatesModal from './components/UpdatesModal';
import AuthScreen from './components/AuthScreen';
import ParallaxBackground from './components/ParallaxBackground';
import ShitDiaryApp from './apps/ShitDiaryApp'; // THE SECOND APP

// Create context for shared state
export const DiaryContext = createContext();

export const useDiary = () => useContext(DiaryContext);

function AnimatedRoutes() {
    const location = useLocation();

    // Smart Key: Keep ShitDiaryApp mounted when navigating inside /shit/*
    // consistently returning 'shit-diary' as key for any /shit/* path
    const routeKey = location.pathname.startsWith('/shit') ? 'shit-diary' : location.pathname;

    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={routeKey}>
                <Route path="/shit/*" element={<ShitDiaryApp />} />
                <Route path="/" element={<Home />} />
                <Route path="/gallery" element={<Gallery />} />
                <Route path="/stats" element={<Stats />} />
                <Route path="/more" element={<More />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/profile" element={<Profile />} />
            </Routes>
        </AnimatePresence>
    );
}

function App() {
    const [entries, setEntries] = useState({});
    const [todayEntry, setTodayEntry] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentStreak, setCurrentStreak] = useState(0);
    const [milestone, setMilestone] = useState(null);
    const [showMilestone, setShowMilestone] = useState(false);

    // Onboarding State
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [guidelinesAccepted, setGuidelinesAccepted] = useState(false);
    const [updatesSeen, setUpdatesSeen] = useState(false);
    const [initialRedirect, setInitialRedirect] = useState(null);

    // Initial check for authentication
    useEffect(() => {
        const terms = localStorage.getItem('s3raeon_terms_accepted');
        const guide = localStorage.getItem('s3raeon_guidelines_accepted');
        const updates = localStorage.getItem('s3raeon_v2_seen');

        if (terms === 'true') setTermsAccepted(true);
        if (guide === 'true') setGuidelinesAccepted(true);
        if (updates === 'true') setUpdatesSeen(true);

        // Firebase Foreground Listener
        import('./firebase').then(({ onMessageListener }) => {
            onMessageListener().then(payload => {
                console.log('Foreground Message:', payload);
            }).catch(err => console.log('failed: ', err));
        });
    }, []);

    // Load entries from Storj on mount
    useEffect(() => {
        async function fetchEntries() {
            try {
                // Add 10s timeout to prevent infinite hanging
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Network timeout')), 10000)
                );

                const entriesData = await Promise.race([
                    loadEntries(),
                    timeoutPromise
                ]);

                // Update today's entry
                const today = getTodayIST();
                setEntries(entriesData || {});
                setTodayEntry(entriesData?.[today] || null);

                // Calculate streak
                const streak = calculateCurrentStreak(entriesData || {});
                setCurrentStreak(streak);

                // BACKGROUND SYNC: Refresh all media links (takes time, do it after initial load)
                syncAllMedia().then(updatedEntries => {
                    if (updatedEntries) {
                        setEntries(prev => ({ ...prev, ...updatedEntries }));
                        setTodayEntry(updatedEntries[today] || null);
                    }
                });
            } catch (error) {
                console.error('Error loading entries:', error);
                // Fallback to empty state on error/timeout
                setEntries({});
            } finally {
                setLoading(false);
            }
        }

        fetchEntries();
    }, []);

    const saveEntry = async (date, entry) => {
        const previousEntries = { ...entries };
        const previousTodayEntry = todayEntry;

        try {
            // Save to server FIRST - don't show success until confirmed
            await storjSaveEntry(date, entry);

            // Only update UI after server confirms success
            const newEntries = { ...entries, [date]: { ...entries[date], ...entry, updatedAt: new Date().toISOString() } };
            setEntries(newEntries);
            setTodayEntry(newEntries[date]);

            // Check for milestones after saving
            const streak = calculateCurrentStreak(newEntries);
            setCurrentStreak(streak);
            const newMilestone = checkMilestone(streak);
            if (newMilestone) {
                setMilestone(newMilestone);
                setShowMilestone(true);
            }
        } catch (error) {
            console.error('Failed to save entry:', error);
            // Revert UI on failure
            setEntries(previousEntries);
            setTodayEntry(previousTodayEntry);
            throw error; // Re-throw so the caller knows it failed
        }
    };

    const togglePhotoStar = (date, photoIndex) => {
        setEntries(prevEntries => {
            const updatedEntries = { ...prevEntries };
            if (updatedEntries[date] && updatedEntries[date].photos) {
                const photo = updatedEntries[date].photos[photoIndex];
                if (photo) {
                    photo.starred = !photo.starred;
                    storjSaveEntry(date, updatedEntries[date]); // Save updated entry
                }
            }
            return updatedEntries;
        });
    };

    const toggleDayStar = (date) => {
        setEntries(prevEntries => {
            const updatedEntries = { ...prevEntries };
            if (updatedEntries[date]) {
                updatedEntries[date].starred = !updatedEntries[date].starred;
                storjSaveEntry(date, updatedEntries[date]); // Save updated entry
            }
            return updatedEntries;
        });
    };

    const handleAcceptTerms = () => {
        setTermsAccepted(true);
        localStorage.setItem('s3raeon_terms_accepted', 'true');
    };

    const handleAcceptGuidelines = () => {
        setGuidelinesAccepted(true);
        localStorage.setItem('s3raeon_guidelines_accepted', 'true');
    };

    const handleSeenUpdates = () => {
        setUpdatesSeen(true);
        localStorage.setItem('s3raeon_v2_seen', 'true');
    };

    const contextValue = {
        entries,
        todayEntry,
        loading,
        currentStreak,
        saveEntry,
        togglePhotoStar,
        toggleDayStar,
        togglePhotoStar,
        toggleDayStar,
        bucketName: BUCKET_NAME, // Default bucket
    };

    const [isAuthenticated, setIsAuthenticated] = useState(false);

    if (!isAuthenticated) {
        return <AuthScreen onAuthenticated={(path) => {
            setIsAuthenticated(true);
            if (path) setInitialRedirect(path);
        }} />;
    }

    // 0. Loading State (Show this BEFORE modals to avoid "stuck" feeling)
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)' }}>
                        <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                </div>
            </div>
        );
    }

    // 1. Show Guidelines First
    if (!guidelinesAccepted) {
        return <GuidelinesModal onAccept={handleAcceptGuidelines} />;
    }

    // 2. Show Terms Second
    if (!termsAccepted) {
        return <TermsModal onAccept={handleAcceptTerms} />;
    }

    // 3. Show Updates Third (Only if onboarding complete)
    if (!updatesSeen) {
        return <UpdatesModal onClose={handleSeenUpdates} />;
    }

    return (
        <DiaryContext.Provider value={contextValue}>
            <ParallaxBackground />
            <BrowserRouter>
                <div className="min-h-screen pb-20">
                    <RedirectHandler to={initialRedirect} setRedirect={setInitialRedirect} />
                    <AnimatedRoutes />
                    <BottomNav />
                </div>

                <MilestonePopup
                    milestone={milestone}
                    isOpen={showMilestone}
                    onClose={() => setShowMilestone(false)}
                />
            </BrowserRouter>
        </DiaryContext.Provider>
    );
}

export default App;
