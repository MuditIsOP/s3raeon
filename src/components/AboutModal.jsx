import { motion } from "framer-motion";

function AboutModal({ onClose }) {
    return (

        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-[#0F0F13] to-[#0F0F13]"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="w-full max-w-md card relative overflow-hidden"
            >
                {/* Decorative background element matching TermsModal */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)] filter blur-[80px] opacity-20 pointer-events-none" />

                <div className="text-center mb-6 relative z-10">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--primary)] shadow-lg shadow-purple-500/10">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    </div>

                    <h2 className="text-2xl font-bold font-display mb-1 text-white">S3RΛEON</h2>
                    <p className="text-xs uppercase tracking-widest text-[var(--text-muted)]">Locked by Time, Opened by Growth</p>
                </div>

                <div className="space-y-4 mb-8 text-center" style={{ color: 'var(--text-secondary)' }}>
                    <p className="text-sm leading-relaxed">
                        I built S3RΛEON because I see how amazing you are, even when you don't.
                    </p>
                    <p className="text-sm leading-relaxed">
                        This is your space to grow, reflect, and become the confident person I already know you to be.
                    </p>
                    <p className="text-sm leading-relaxed">
                        Every feature here is designed to help you see yourself the way I see you.
                    </p>
                </div>

                <div className="space-y-4 relative z-10">
                    <div className="text-center pb-4 border-b border-[var(--border)]">
                        <p className="text-xs text-[var(--text-muted)] italic">With love,</p>
                        <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text)' }}>Mudit</p>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-3.5 rounded-xl font-semibold bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default AboutModal;
