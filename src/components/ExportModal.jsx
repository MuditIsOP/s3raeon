import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate } from "../utils/timeUtils";

const EXPORT_OPTIONS = [
    {
        id: 'json',
        label: 'Backup (JSON)',
        desc: 'Machine-readable, for restoring later.',
        icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
    },
    {
        id: 'txt',
        label: 'Readable (TXT)',
        desc: 'Plain text, easy to read and print.',
        icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    },
    {
        id: 'csv',
        label: 'Spreadsheet (CSV)',
        desc: 'For Excel or Google Sheets analysis.',
        icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7-6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2z" /></svg>
    }
];

function ExportModal({ onClose, entries }) {
    const backdropRef = useRef(null);

    const handleBackdropClick = (e) => {
        if (backdropRef.current === e.target) {
            onClose();
        }
    };

    const generateExport = (type) => {
        const timestamp = new Date().toISOString().split('T')[0];
        let content = '';
        let filename = `s3raeon-export-${timestamp}`;
        let mimeType = 'text/plain';

        const sortedEntries = Object.entries(entries).sort((a, b) => new Date(b[0]) - new Date(a[0]));

        if (type === 'json') {
            content = JSON.stringify(entries, null, 2);
            filename += '.json';
            mimeType = 'application/json';
        } else if (type === 'txt') {
            content = `S3RΛEON JOURNAL EXPORT\nGenerated on: ${timestamp}\n\n`;
            sortedEntries.forEach(([date, entry]) => {
                content += `----------------------------------------\n`;
                content += `DATE: ${formatDate(date)}\n`;
                content += `MOOD: ${['Unknown', 'Great 🤩', 'Good 😊', 'Okay 😐', 'Low 😔', 'Hard 😣'][entry.mood] || 'None'}\n`;
                if (entry.affirmation) content += `AFFIRMATION: ${entry.affirmation}\n`;
                content += `JOURNAL:\n${entry.journal}\n`;
                if (entry.audioUrl) content += `[Voice Recording Attached]\n`;
                content += `\n`;
            });
            filename += '.txt';
        } else if (type === 'csv') {
            // CSV Header
            content = "Date,Formatted Date,Mood,Affirmation,Journal,Audio URL\n";
            const escapeCsv = (str) => {
                if (!str) return '';
                const stringified = str.replace(/"/g, '""'); // Escape double quotes
                return `"${stringified}"`; // Wrap in quotes
            };

            sortedEntries.forEach(([date, entry]) => {
                const row = [
                    date,
                    formatDate(date),
                    ['Unknown', 'Great', 'Good', 'Okay', 'Low', 'Hard'][entry.mood] || '',
                    escapeCsv(entry.affirmation),
                    escapeCsv(entry.journal),
                    escapeCsv(entry.audioUrl)
                ].join(',');
                content += row + "\n";
            });
            filename += '.csv';
            mimeType = 'text/csv';
        }

        // Trigger Download
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);

        onClose();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            ref={backdropRef}
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className="w-full max-w-sm bg-[var(--card-bg)] rounded-3xl overflow-hidden border border-[var(--border)] shadow-2xl"
            >
                <div className="p-6">
                    <div className="w-12 h-1 bg-[var(--border)] rounded-full mx-auto mb-6" />

                    <h3 className="text-xl font-bold text-center mb-2 text-gradient">Export Data</h3>
                    <p className="text-sm text-center mb-8" style={{ color: 'var(--text-muted)' }}>
                        Choose a format to save your journal entries.
                    </p>

                    <div className="space-y-3">
                        {EXPORT_OPTIONS.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => generateExport(option.id)}
                                className="w-full flex items-center gap-4 p-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                            >
                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ background: 'var(--primary)' }}>
                                    {option.icon}
                                </div>
                                <div className="text-left flex-1">
                                    <div className="font-semibold" style={{ color: 'var(--text)' }}>{option.label}</div>
                                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{option.desc}</div>
                                </div>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full mt-6 py-3 font-semibold text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default ExportModal;
