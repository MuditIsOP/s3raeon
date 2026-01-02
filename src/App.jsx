import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { getTodayIST } from './utils/timeUtils';
import { calculateCurrentStreak, checkMilestone } from './utils/streakUtils';
import { loadEntries, saveEntry as storjSaveEntry } from './storj';

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

// Create context for shared state
export const DiaryContext = createContext();

export const useDiary = () => useContext(DiaryContext);

function AnimatedRoutes() {
    const location = useLocation();

    return (
        <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
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

    // Check for acceptance on mount
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

    // ... (existing code) ...

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

    // ... (contextValue definition) ...

    const [isAuthenticated, setIsAuthenticated] = useState(false);

    if (!isAuthenticated) {
        return <AuthScreen onAuthenticated={() => setIsAuthenticated(true)} />;
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

    return (
        <DiaryContext.Provider value={contextValue}>
            <BrowserRouter>
                <div className="min-h-screen pb-20">
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
