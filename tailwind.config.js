/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Coral/Pink theme
                'coral': {
                    50: '#FFF5F5',
                    100: '#FFE5E3',
                    200: '#FFCCC8',
                    300: '#FFB3AD',
                    400: '#F09A94',
                    500: '#E8847C',
                    600: '#D66B63',
                    700: '#C4524A',
                    800: '#A33D36',
                    900: '#822E28',
                },
                // Mood colors (softer versions)
                'mood-amazing': '#22c55e',
                'mood-good': '#84cc16',
                'mood-okay': '#eab308',
                'mood-rough': '#f97316',
                'mood-difficult': '#ef4444',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            animation: {
                'bounce-slow': 'bounce 2s infinite',
                'pulse-slow': 'pulse 3s infinite',
            },
            boxShadow: {
                'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
            }
        },
    },
    plugins: [],
}
