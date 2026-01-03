import { motion } from 'framer-motion';

function UpdatesModal({ onClose }) {
    const updates = [
        {
            title: "Security Suite",
            desc: "Added Password Change & Security Question options in Profile.",
            icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>,
            color: "text-red-400",
            bg: "bg-red-500/10"
        },
        {
            title: "Voice Logic 2.0",
            desc: "Voice player stays visible even when locked. Retake protection added.",
            icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>,
            color: "text-indigo-400",
            bg: "bg-indigo-500/10"
        },
        {
            title: "Visual Polish",
            desc: "Affirmations & Prompts now appear in full detail views.",
            icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>,
            color: "text-pink-400",
            bg: "bg-pink-500/10"
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
                className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl relative overflow-hidden max-h-[85vh] overflow-y-auto"
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
                    <h2 className="text-3xl font-bold font-display text-white mb-2">S3RΛEON 3.0</h2>
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
