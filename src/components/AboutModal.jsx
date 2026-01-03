import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

function AboutModal({ onClose }) {
    const backdropRef = useRef(null);

    const handleBackdropClick = (e) => {
        if (backdropRef.current === e.target) {
            onClose();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            ref={backdropRef}
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-sm bg-[var(--card-bg)] rounded-3xl overflow-hidden border border-[var(--border)] shadow-2xl relative"
            >
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[var(--primary)]/20 to-transparent pointer-events-none" />

                <div className="p-8 text-center relative z-10">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <span className="text-3xl font-bold text-white">S</span>
                    </div>

                    <h3 className="text-2xl font-bold mb-2 text-gradient">S3RΛEON</h3>
                    <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-8">For You</p>

                    <div className="space-y-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        <p>
                            I built S3RΛEON because I see how amazing you are, even when you don't.
                        </p>
                        <p>
                            This is your space to grow, reflect, and become the confident person I already know you to be.
                        </p>
                        <p>
                            Every feature here is designed to help you see yourself the way I see you.
                        </p>
                    </div>

                    <div className="mt-8 pt-6 border-t border-[var(--border)]">
                        <p className="text-xs text-[var(--text-muted)] italic">With love,</p>
                        <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text)' }}>Mudit</p>
                    </div>
                </div>

                <div className="p-4 bg-[var(--bg-elevated)] border-t border-[var(--border)]">
                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-xl bg-[var(--primary)] text-white font-semibold shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all active:scale-[0.98]"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default AboutModal;
