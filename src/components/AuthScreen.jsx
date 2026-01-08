import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { loadConfig, saveConfig } from '../storj';

const SHIT_PASSWORD = "I will be better for arshita";

function AuthScreen({ onAuthenticated }) {
    // Modes: 'loading' | 'login' | 'setup' | 'recovery'
    const [mode, setMode] = useState('loading');
    const [config, setConfig] = useState(null);
    const [inputPassword, setInputPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Toggle for Shit Diary Mode
    const [isShitMode, setIsShitMode] = useState(false);

    // Setup State
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [securityQuestion, setSecurityQuestion] = useState('');
    const [securityAnswer, setSecurityAnswer] = useState('');

    // Recovery State
    const [recoveryAnswer, setRecoveryAnswer] = useState('');
    const [revealedPassword, setRevealedPassword] = useState(null);

    useEffect(() => {
        checkConfig();
    }, []);

    const checkConfig = async () => {
        try {
            const data = await loadConfig();
            if (data && data.password) {
                setConfig(data);
                setMode('login');
            } else {
                setMode('setup');
            }
        } catch (err) {
            console.error(err);
            setMode('setup'); // Default to setup on error (safest)
        }
    };

    const handleLogin = (e) => {
        e.preventDefault();

        if (isShitMode) {
            // Case 2: App 2 Mode (Shit Diary)
            // Accepts BOTH passwords
            if (inputPassword === SHIT_PASSWORD || inputPassword === config.password) {
                onAuthenticated('/shit');
            } else {
                setError('Incorrect password');
                setTimeout(() => setError(''), 2000);
            }
        } else {
            // Case 1: App 1 Mode (S3RAEON)
            // ONLY accepts Main Password. Rejects Shit Password.
            if (inputPassword === config.password) {
                onAuthenticated('/');
            } else {
                setError('Incorrect password');
                setTimeout(() => setError(''), 2000);
            }
        }
    };

    const handleSetup = async (e) => {
        e.preventDefault();
        if (newPassword.length < 4) {
            setError('Password too short');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (!securityQuestion || !securityAnswer) {
            setError('Security question required');
            return;
        }

        try {
            const newConfig = {
                password: newPassword,
                securityQuestion,
                securityAnswer
            };
            await saveConfig(newConfig);
            setConfig(newConfig);
            onAuthenticated(); // Auto login after setup
        } catch (err) {
            setError('Failed to save. Try again.');
        }
    };

    const handleRecovery = (e) => {
        e.preventDefault();
        // Simple case-insensitive check
        if (recoveryAnswer.toLowerCase().trim() === config.securityAnswer.toLowerCase().trim()) {
            setRevealedPassword(config.password);
        } else {
            setError('Incorrect answer');
            setTimeout(() => setError(''), 2000);
        }
    };

    return (
        <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-colors duration-500 ${isShitMode ? 'theme-shit bg-[var(--bg)]' : ''}`} style={{ background: 'var(--bg)' }}>
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-20 blur-[100px] transition-colors duration-500`} style={{ background: 'var(--primary)' }} />
                <div className={`absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-20 blur-[100px] transition-colors duration-500`} style={{ background: 'var(--accent)' }} />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card w-full max-w-md relative z-10"
            >
                {mode === 'loading' && (
                    <div className="py-12 text-center">
                        <div className="w-8 h-8 mx-auto border-3 border-white border-t-transparent rounded-full animate-spin mb-4" />
                        <p style={{ color: 'var(--text-muted)' }}>Checking Security...</p>
                    </div>
                )}

                {mode === 'login' && (
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="text-center">
                            <h2 className={`text-2xl font-bold mb-2 ${isShitMode ? 'text-[var(--primary)]' : 'text-gradient'}`}>
                                {isShitMode ? "SHIT'S DIARY" : "Welcome Back"}
                            </h2>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Enter password to unlock {isShitMode ? "Diary" : "S3RΛEON"}</p>
                        </div>

                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={inputPassword}
                                onChange={(e) => setInputPassword(e.target.value)}
                                placeholder="Password"
                                className={`input-field text-center text-lg tracking-widest ${error ? 'border-red-500' : ''}`}
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(prev => !prev)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                            >
                                {showPassword ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                )}
                            </button>
                            {error && <p className="text-red-400 text-xs text-center mt-2">{error}</p>}
                        </div>

                        {/* Custom Auth Toggle Switch */}
                        <div className="flex bg-[var(--bg-elevated)] p-1 rounded-full relative mb-6 cursor-pointer border border-[var(--border)] h-12" onClick={() => setIsShitMode(!isShitMode)}>
                            {/* Sliding Background */}
                            <motion.div
                                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full shadow-sm z-0 ${isShitMode ? 'bg-[var(--primary)]' : 'bg-purple-600'}`}
                                animate={{ left: isShitMode ? '50%' : '4px' }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />

                            {/* Left Side: S3RAEON */}
                            <div className={`flex-1 flex items-center justify-center relative z-10 text-sm font-bold transition-colors duration-300 ${!isShitMode ? 'text-white' : 'text-[var(--text-muted)]'}`}>
                                S3RΛEON
                            </div>

                            {/* Right Side: DIARY */}
                            <div className={`flex-1 flex items-center justify-center relative z-10 text-sm font-bold transition-colors duration-300 ${isShitMode ? 'text-white' : 'text-[var(--text-muted)]'}`}>
                                DIARY
                            </div>
                        </div>

                        <button type="submit" className="btn-primary w-full">Unlock</button>

                        <div className="flex justify-center items-center px-1">
                            <button
                                type="button"
                                onClick={() => setMode('recovery')}
                                className="text-xs hover:underline"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                Forgot Password?
                            </button>
                        </div>
                    </form>
                )}

                {mode === 'setup' && (
                    <form onSubmit={handleSetup} className="space-y-4">
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold mb-2">Setup Security</h2>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Set a password to protect your diary.</p>
                        </div>

                        <div className="space-y-3">
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="New Password"
                                className="input-field"
                            />
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm Password"
                                className="input-field"
                            />
                        </div>

                        <div className="pt-2 space-y-3">
                            <p className="text-xs font-medium pl-1" style={{ color: 'var(--text-secondary)' }}>Security Question (for recovery):</p>
                            <input
                                type="text"
                                value={securityQuestion}
                                onChange={(e) => setSecurityQuestion(e.target.value)}
                                placeholder="e.g. What is my first pet's name?"
                                className="input-field"
                            />
                            <input
                                type="text"
                                value={securityAnswer}
                                onChange={(e) => setSecurityAnswer(e.target.value)}
                                placeholder="Answer"
                                className="input-field"
                            />
                        </div>

                        {error && <p className="text-red-400 text-xs text-center">{error}</p>}

                        <button type="submit" className="btn-primary w-full mt-4">Save & Unlock</button>
                    </form>
                )}

                {mode === 'recovery' && (
                    <form onSubmit={handleRecovery} className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-xl font-bold mb-2">Recovery</h2>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                {config?.securityQuestion || 'Security Question'}
                            </p>
                        </div>

                        {!revealedPassword ? (
                            <>
                                <div>
                                    <input
                                        type="text"
                                        value={recoveryAnswer}
                                        onChange={(e) => setRecoveryAnswer(e.target.value)}
                                        placeholder="Your Answer"
                                        className={`input-field ${error ? 'border-red-500' : ''}`}
                                        autoFocus
                                    />
                                    {error && <p className="text-red-400 text-xs text-center mt-2">{error}</p>}
                                </div>
                                <button type="submit" className="btn-primary w-full">Reveal Password</button>
                            </>
                        ) : (
                            <div className="text-center p-4 rounded-xl" style={{ background: 'var(--bg-elevated)' }}>
                                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Your Password:</p>
                                <p className="text-xl font-mono font-bold text-gradient select-all">{revealedPassword}</p>
                                <button
                                    type="button"
                                    onClick={() => setMode('login')}
                                    className="btn-secondary w-full mt-4"
                                >
                                    Back to Login
                                </button>
                            </div>
                        )}

                        {!revealedPassword && (
                            <button
                                type="button"
                                onClick={() => setMode('login')}
                                className="w-full text-xs text-center hover:underline"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                Back
                            </button>
                        )}
                    </form>
                )}
            </motion.div>
        </div>
    );
}

export default AuthScreen;
