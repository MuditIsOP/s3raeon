import { useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue, useTransform } from 'framer-motion';

function ParallaxBackground() {
    const [isMobile, setIsMobile] = useState(false);

    // Mouse position state
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    // Smooth spring animation for mouse movement
    const smoothX = useSpring(mouseX, { stiffness: 50, damping: 20 });
    const smoothY = useSpring(mouseY, { stiffness: 50, damping: 20 });

    useEffect(() => {
        // Detect mobile
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);

        // Track mouse movement
        const handleMouseMove = (e) => {
            const { clientX, clientY } = e;
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;

            // Calculate distance from center (-1 to 1)
            mouseX.set((clientX - centerX) / centerX);
            mouseY.set((clientY - centerY) / centerY);
        };

        if (!isMobile) {
            window.addEventListener('mousemove', handleMouseMove);
        }

        return () => {
            window.removeEventListener('resize', checkMobile);
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    // Layer Transforms (Parallax strength)
    // Deep background (slowest) to foreground (fastest)
    const layer1X = useTransform(smoothX, [-1, 1], [20, -20]);
    const layer1Y = useTransform(smoothY, [-1, 1], [20, -20]);

    const layer2X = useTransform(smoothX, [-1, 1], [40, -40]);
    const layer2Y = useTransform(smoothY, [-1, 1], [40, -40]);

    const layer3X = useTransform(smoothX, [-1, 1], [60, -60]);
    const layer3Y = useTransform(smoothY, [-1, 1], [60, -60]);

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]" style={{ background: 'var(--bg)' }}>

            {/* Base Gradient - Static */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.08),transparent_70%)]" />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle_at_50%_50%,rgba(244,63,94,0.05),transparent_70%)] opacity-60 mix-blend-screen" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.05),transparent_70%)] opacity-60 mix-blend-screen" />

            {/* Parallax Layer 1 - Furthest/Slowest (Stars/Dust) */}
            <motion.div
                style={{ x: layer1X, y: layer1Y }}
                className="absolute inset-[-50px] opacity-30"
            >
                <div className="absolute top-[20%] left-[10%] w-1 h-1 bg-white rounded-full opacity-40 blur-[1px]" />
                <div className="absolute top-[80%] right-[30%] w-1.5 h-1.5 bg-blue-300 rounded-full opacity-30 blur-[1px]" />
                <div className="absolute bottom-[40%] left-[40%] w-1 h-1 bg-purple-300 rounded-full opacity-40 blur-[1px]" />
                <div className="absolute top-[15%] right-[15%] w-2 h-2 bg-indigo-300 rounded-full opacity-20 blur-[2px]" />
            </motion.div>

            {/* Parallax Layer 2 - Mid (Floating Orbs) */}
            <motion.div
                style={{ x: layer2X, y: layer2Y }}
                className="absolute inset-[-50px] opacity-40"
            >
                <div className="absolute top-[30%] left-[80%] w-32 h-32 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-[20%] right-[80%] w-48 h-48 bg-accent/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s' }} />
            </motion.div>

            {/* Parallax Layer 3 - Closest/Fastest (Subtle Highlights) */}
            <motion.div
                style={{ x: layer3X, y: layer3Y }}
                className="absolute inset-[-50px] opacity-50"
            >
                <div className="absolute top-[60%] left-[20%] w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px]" />
            </motion.div>

            {/* Overlay Scanlines/Grain for texture (Optional, keeps it clean for now) */}
        </div>
    );
}

export default ParallaxBackground;
