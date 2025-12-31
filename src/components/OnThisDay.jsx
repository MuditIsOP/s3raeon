import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getOnThisDayDates, formatDate } from '../utils/timeUtils';

function OnThisDay({ entries }) {
    const [memories, setMemories] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const pastDates = getOnThisDayDates();
        const foundMemories = pastDates
            .filter(date => entries[date])
            .map(date => ({
                date,
                entry: entries[date]
            }));

        setMemories(foundMemories);
    }, [entries]);

    if (memories.length === 0) return null;

    const currentMemory = memories[currentIndex];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card mb-6"
        >
            <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">📸</span>
                <h3 className="text-sm font-semibold text-white/80">On This Day</h3>
                {memories.length > 1 && (
                    <span className="text-xs text-white/40 ml-auto">
                        {currentIndex + 1} of {memories.length}
                    </span>
                )}
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={currentMemory.date}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex gap-4"
                >
                    {/* Photo preview */}
                    {currentMemory.entry.photos?.[0] && (
                        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                            <img
                                src={currentMemory.entry.photos[0].url}
                                alt="Memory"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}

                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary-400 mb-1">
                            {formatDate(currentMemory.date, 'MMMM d, yyyy')}
                        </p>

                        {/* Mood */}
                        {currentMemory.entry.mood && (
                            <span className="text-lg mr-2">
                                {['😊', '🙂', '😐', '😔', '😢'][currentMemory.entry.mood - 1]}
                            </span>
                        )}

                        {/* Journal excerpt */}
                        {currentMemory.entry.journal && (
                            <p className="text-sm text-white/60 line-clamp-2">
                                {currentMemory.entry.journal}
                            </p>
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Navigation dots */}
            {memories.length > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                    {memories.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            className={`w-2 h-2 rounded-full transition-all ${index === currentIndex
                                    ? 'bg-primary-500 w-4'
                                    : 'bg-white/20 hover:bg-white/40'
                                }`}
                        />
                    ))}
                </div>
            )}
        </motion.div>
    );
}

export default OnThisDay;
