import { motion } from 'framer-motion';

function UpdatesModal({ onClose }) {
    const updates = [
        {
            title: "Magic Updates",
            desc: "The app now updates itself! New features appear automatically.",
            icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
            color: "text-blue-400",
            bg: "bg-blue-500/10"
        },
        {
            title: "Voice Journey",
            desc: "Listen to all your past affirmations in one place. (Now with 'Voice Mode'!)",
            icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>,
            color: "text-green-400",
            bg: "bg-green-500/10"
        },
        {
            title: "Smart Search",
            desc: "Find any memory instantly. History is now always visible.",
            icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
            color: "text-purple-400",
            bg: "bg-purple-500/10"
        },
        {
            title: "Smoother Experience",
            desc: "Faster animations, fixed bugs, and cleaner UI.",
            icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
            color: "text-yellow-400",
            bg: "bg-yellow-500/10"
        }
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/95 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl relative overflow-hidden"
            >
                {/* Background Glow */}
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

                <div className="text-center mb-8 relative z-10">
                    <motion.div
                        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
                        className="inline-block px-4 py-1.5 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white text-xs font-bold uppercase tracking-wider mb-4 shadow-lg"
                    >
                        New Update
                    </motion.div>
                    <h2 className="text-3xl font-bold font-display text-white mb-2">S3RΛEON 2.0</h2>
                    <p className="text-[var(--text-muted)] text-sm">Better. Faster. Smarter.</p>
                </div>

                <div className="space-y-4 mb-8 relative z-10">
                    {updates.map((item, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 + 0.3 }}
                            className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors"
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${item.bg} ${item.color}`}>
                                {item.icon}
                            </div>
                            <div>
                                <h3 className="font-semibold text-white text-sm">{item.title}</h3>
                                <p className="text-xs text-[var(--text-muted)] leading-relaxed">{item.desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <button
                    onClick={onClose}
                    className="w-full py-3.5 rounded-xl font-semibold bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transform hover:-translate-y-0.5 transition-all relative z-10"
                >
                    Awesome!
                </button>
            </motion.div>
        </motion.div>
    );
}

export default UpdatesModal;
