import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

function MilestonePopup({ milestone, isOpen, onClose }) {
    useEffect(() => {
        if (isOpen && milestone) {
            const duration = 3000;
            const end = Date.now() + duration;
            const colors = [milestone.color, '#E8847C', '#ffd700'];

            (function frame() {
                confetti({
                    particleCount: 3,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: colors,
                });
                confetti({
                    particleCount: 3,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: colors,
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            })();
        }
    }, [isOpen, milestone]);

    if (!milestone) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.5, y: 50 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
                    >
                        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center pointer-events-auto shadow-2xl">
                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ delay: 0.2, type: 'spring', damping: 10 }}
                                className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center text-4xl"
                                style={{ backgroundColor: `${milestone.color}20` }}
                            >
                                {milestone.emoji}
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                            >
                                <p className="text-sm uppercase tracking-wider text-gray-500 mb-2">
                                    🎉 Achievement Unlocked!
                                </p>
                                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                                    {milestone.label} Streak!
                                </h2>
                                <p className="text-lg font-semibold mb-6" style={{ color: milestone.color }}>
                                    {milestone.days} Days Strong 🔥
                                </p>
                                <p className="text-gray-500 mb-8">
                                    You're building an incredible habit. Keep up the amazing work!
                                </p>
                            </motion.div>

                            <motion.button
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                onClick={onClose}
                                className="btn-primary"
                            >
                                Continue Journey
                            </motion.button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export default MilestonePopup;
