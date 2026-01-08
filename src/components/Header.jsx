import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDiary } from '../App';
import { loadProfile, getInitials } from '../profile';

function Header({ title, showStreak = false, showProfile = true, onClose }) {
    const { currentStreak } = useDiary();
    const navigate = useNavigate();
    const location = useLocation();
    const [profile, setProfile] = useState({ firstName: 'Arshita' });

    const isShitDiary = location.pathname.startsWith('/shit');

    useEffect(() => {
        loadProfile().then(setProfile);
    }, []);

    return (
        <header className="header">
            <div className="header-top">
                <div className="flex items-center gap-3">
                    <div className="logo">
                        <span className="logo-text">
                            {isShitDiary ? 'SHIT' : 'S3RΛ'}
                            <span className="logo-accent">EON</span>
                        </span>
                    </div>
                </div>

                <div className="header-right">
                    {showStreak && currentStreak > 0 && (
                        <div className="streak-badge px-3 py-1 bg-[var(--bg-elevated)] rounded-full flex items-center gap-1.5 border border-[var(--border)]">
                            <span className="text-sm font-semibold text-[var(--primary)]">🔥 {currentStreak}</span>
                            <span className="text-xs font-medium text-[var(--text-muted)]">Days Streak</span>
                        </div>
                    )}
                    {showProfile && !onClose && (
                        <button
                            onClick={() => navigate(isShitDiary ? '/shit/profile' : '/profile')}
                            className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border-2 border-[var(--bg-elevated)]"
                            style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                        >
                            {profile.profilePhotoUrl ? (
                                <img src={profile.profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span className="font-bold text-sm">{getInitials(profile.firstName)}</span>
                            )}
                        </button>
                    )}
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    )}
                </div>
            </div>
            {title && <h1 className="page-title">{title}</h1>}
        </header>
    );
}

export default Header;
