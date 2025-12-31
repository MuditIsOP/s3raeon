import { motion } from 'framer-motion';

const moods = [
    { value: 1, label: 'Great', color: '#22c55e' },
    { value: 2, label: 'Good', color: '#84cc16' },
    { value: 3, label: 'Okay', color: '#eab308' },
    { value: 4, label: 'Low', color: '#f97316' },
    { value: 5, label: 'Hard', color: '#ef4444' },
];

function MoodPicker({ selected, onSelect }) {
    return (
        <div className="mood-picker">
            {moods.map((mood) => (
                <motion.button
                    key={mood.value}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onSelect(mood.value)}
                    className={`mood-btn ${selected === mood.value ? 'selected' : ''}`}
                    style={{
                        borderColor: selected === mood.value ? mood.color : undefined,
                        background: selected === mood.value ? mood.color : undefined
                    }}
                >
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: selected === mood.value ? 'white' : mood.color }}
                    />
                    <span className="label">{mood.label}</span>
                </motion.button>
            ))}
        </div>
    );
}

export default MoodPicker;
