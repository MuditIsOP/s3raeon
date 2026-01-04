import { useState } from 'react';
import { motion } from 'framer-motion';

function GuidelinesModal({ onAccept, onClose, readOnly = false }) {
    const [isChecked, setIsChecked] = useState(false);

    const guidelines = [
        {
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
            ),
            title: "Voice Affirmations",
            text: "You must repeat the daily voice message 5 times in a single recording. You are allowed only 1 upload per day. (Available 5 AM - 10 AM)"
        },
        {
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
            title: "Photo Memories",
            text: "Upload exactly 5 images that define your day (5 uploads per day). No less, no more."
        },
        {
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
            ),
            title: "Journaling",
            text: (
                <span>
                    Answer truthfully (at least 200 words). But importantly, always write about <span className="font-bold text-white">"How was your day?"</span>. <span className="text-red-400">No edits allowed anywhere.</span> (Available 8 PM - 12 AM)
                </span>
            )
        }
    ];

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
                {/* Decorative background element */}
                <div className="absolute top-0 left-0 w-32 h-32 bg-[var(--accent)] filter blur-[80px] opacity-20 pointer-events-none" />

                <div className="text-center mb-8">
                    <p className="logo-text text-2xl mb-2">S3RΛ<span className="logo-accent">EON</span></p>
                    <p className="text-[var(--text-muted)] text-sm">
                        {readOnly ? "Your guide to using this sanctuary." : "Hi Sera, please understand how this works."}
                    </p>
                </div>

                <div className="space-y-6 mb-8">
                    {guidelines.map((item, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 + 0.2 }}
                            className="flex items-start gap-4"
                        >
                            <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center flex-shrink-0 text-[var(--primary)]">
                                {item.icon}
                            </div>
                            <div>
                                <h3 className="font-semibold text-[var(--text)] mb-1">{item.title}</h3>
                                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.text}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="space-y-4">
                    {!readOnly && (
                        <div className="space-y-2">
                            <p className="text-xs text-right text-[var(--text-muted)] italic font-medium pr-1">— from Mudit</p>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${isChecked ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-[var(--border)] group-hover:border-[var(--text-muted)]'}`}>
                                    {isChecked && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <input type="checkbox" className="hidden" checked={isChecked} onChange={(e) => setIsChecked(e.target.checked)} />
                                <span className={`text-sm transition-colors ${isChecked ? 'text-white' : 'text-[var(--text-muted)]'}`}>I understand the guidelines</span>
                            </label>
                        </div>
                    )}

                    <button
                        onClick={readOnly ? onClose : onAccept}
                        disabled={!readOnly && !isChecked}
                        className={`w-full py-3.5 rounded-xl font-semibold transition-all ${readOnly || isChecked ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-not-allowed'}`}
                    >
                        {readOnly ? 'Close' : 'Continue'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default GuidelinesModal;
