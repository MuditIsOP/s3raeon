import { useState, useEffect } from 'react';
import { getPresignedUrl } from '../storj';

/**
 * An Image component that automatically refreshes its S3 URL if it fails to load
 */
export function SmartImage({ src, alt, s3Key, className, style, ...props }) {
    const [currentSrc, setCurrentSrc] = useState(src);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        setCurrentSrc(src);
        setError(false);
    }, [src]);

    const handleError = async () => {
        if (isRefreshing || !s3Key) {
            setError(true);
            return;
        }

        console.log(`🔄 Image expired, refreshing: ${s3Key}`);
        setIsRefreshing(true);

        try {
            const freshUrl = await getPresignedUrl(s3Key);
            setCurrentSrc(freshUrl);
            setError(false);
        } catch (err) {
            console.error("Failed to refresh image URL:", err);
            setError(true);
        } finally {
            setIsRefreshing(false);
        }
    };

    if (error) {
        return (
            <div className={`${className} flex items-center justify-center bg-gray-800/20 text-gray-500`} style={style}>
                <svg className="w-6 h-6 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
        );
    }

    return (
        <img
            src={currentSrc}
            alt={alt}
            className={`${className} ${isRefreshing ? 'opacity-50' : ''}`}
            style={style}
            onError={handleError}
            {...props}
        />
    );
}

/**
 * An wrapper for Audio playback that refreshes S3 URL if needed
 */
export function SmartAudioTrigger({ src, s3Key, children }) {
    const [currentSrc, setCurrentSrc] = useState(src);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        setCurrentSrc(src);
    }, [src]);

    const refresh = async () => {
        if (isRefreshing || !s3Key) return currentSrc;

        setIsRefreshing(true);
        try {
            const freshUrl = await getPresignedUrl(s3Key);
            setCurrentSrc(freshUrl);
            return freshUrl;
        } catch (err) {
            console.error("Failed to refresh audio URL:", err);
            return currentSrc;
        } finally {
            setIsRefreshing(false);
        }
    };

    return children({ src: currentSrc, refresh, isRefreshing });
}
