import { motion } from 'framer-motion';

function StreakDisplay({ streak }) {
    return (
        <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2 glass rounded-full cursor-pointer"
        >
            <span className="text-2xl streak-fire">🔥</span>
            <div className="text-right">
                <div className="text-lg font-bold text-white">{streak}</div>
                <div className="text-xs text-white/60">day streak</div>
            </div>
        </motion.div>
    );
}

export default StreakDisplay;
