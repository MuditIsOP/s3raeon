import { useState } from 'react';
import { motion } from 'framer-motion';

function TermsModal({ onAccept, onClose, readOnly = false }) {
    const [isChecked, setIsChecked] = useState(false);

    const terms = [
        "I promise to mean every word I say in my voice notes.",
        "I will not lie in my journal entries.",
        "I commit to making this a daily habit, not just a two-day phase.",
        "I will write from my heart, not just rush through it.",
        "I understand this is a serious tool for my growth, not a toy.",
        "I promise to keep feeding Mudit!"
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
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)] filter blur-[80px] opacity-20 pointer-events-none" />

                <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--primary)]">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold font-display mb-2 text-white">Terms & Conditions</h2>
                    <p className="text-[var(--text-muted)] text-sm">
                        {readOnly ? "The promises you made to yourself." : "Before you enter your sanctuary, we need to agree on a few things."}
                    </p>
                </div>

                <div className="space-y-4 mb-8">
                    {terms.map((term, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 + 0.2 }}
                            className="flex items-start gap-3"
                        >
                            <div className="mt-1 min-w-[1.25rem] h-5 flex items-center justify-center rounded-full bg-[var(--bg-elevated)] text-[var(--accent)] text-xs font-bold">
                                {index + 1}
                            </div>
                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{term}</p>
                        </motion.div>
                    ))}
                </div>

                <div className="space-y-4">
                    {!readOnly && (
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${isChecked ? 'bg-[var(--primary)] border-[var(--primary)]' : 'border-[var(--border)] group-hover:border-[var(--text-muted)]'}`}>
                                {isChecked && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <input type="checkbox" className="hidden" checked={isChecked} onChange={(e) => setIsChecked(e.target.checked)} />
                            <span className={`text-sm transition-colors ${isChecked ? 'text-white' : 'text-[var(--text-muted)]'}`}>I accept these terms & conditions</span>
                        </label>
                    )}

                    <button
                        onClick={readOnly ? onClose : onAccept}
                        disabled={!readOnly && !isChecked}
                        className={`w-full py-3.5 rounded-xl font-semibold transition-all ${readOnly || isChecked ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-not-allowed'}`}
                    >
                        {readOnly ? 'Close' : 'Enter S3RΛEON'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default TermsModal;
