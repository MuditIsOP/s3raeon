import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { setDevTime, resetDevTime } from '../utils/timeUtils';
import { DateTime } from 'luxon';

function DevToolsModal({ onClose }) {
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [targetTime, setTargetTime] = useState(DateTime.now().toFormat("yyyy-MM-dd'T'HH:mm"));
    const [error, setError] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        if (password === 'ASHIIISTHEPRETTIESTLADYITW') {
            setIsAuthenticated(true);
            setError('');
        } else {
            setError('Access Denied: Invalid Authorization.');
        }
    };

    const handleSetTime = () => {
        setDevTime(targetTime);
        onClose();
    };

    const handleReset = () => {
        resetDevTime();
        onClose();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--primary)] rounded-2xl p-6 shadow-2xl relative overflow-hidden"
            >
                {/* Hacker-style styling elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-[var(--primary)] shadow-[0_0_10px_var(--primary)]" />

                <h2 className="text-xl font-mono font-bold text-[var(--primary)] mb-6 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                    S3RAEON // DEV_TOOLS
                </h2>

                {!isAuthenticated ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-mono text-[var(--text-muted)] mb-1">ENTER_ADMIN_CREDENTIALS</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-4 py-3 font-mono text-sm focus:border-[var(--primary)] focus:outline-none transition-colors"
                                placeholder="••••••••••••••••"
                                autoFocus
                            />
                        </div>
                        {error && <p className="text-red-500 text-xs font-mono">{error}</p>}

                        <div className="flex gap-3 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 rounded-lg font-mono text-sm border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                            >
                                ABORT
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-3 rounded-lg font-mono text-sm font-bold bg-[rgba(99,102,241,0.1)] text-[var(--primary)] border border-[var(--primary)] hover:bg-[rgba(99,102,241,0.2)]"
                            >
                                AUTHENTICATE
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-6">
                        <div className="p-4 bg-[rgba(34,197,94,0.1)] border border-green-500/30 rounded-lg">
                            <p className="text-green-500 font-mono text-xs">ACCESS GRANTED. TIME TRAVEL PROTOCOLS INITIALIZED.</p>
                        </div>

                        <div>
                            <label className="block text-xs font-mono text-[var(--text-muted)] mb-1">TARGET_TEMPORAL_COORDINATES</label>
                            <input
                                type="datetime-local"
                                value={targetTime}
                                onChange={(e) => setTargetTime(e.target.value)}
                                className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm focus:border-[var(--primary)] focus:outline-none"
                                style={{ colorScheme: 'dark' }}
                            />
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={handleSetTime}
                                className="w-full py-3 rounded-lg font-mono text-sm font-bold bg-[var(--primary)] text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] hover:shadow-[0_0_20px_rgba(99,102,241,0.6)] transition-all"
                            >
                                ENGAGE TIME JUMP
                            </button>

                            <button
                                onClick={handleReset}
                                className="w-full py-3 rounded-lg font-mono text-sm border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] transition-colors"
                            >
                                RESTORE TIMELINE (RESET)
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}

export default DevToolsModal;
