import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Storj S3-compatible configuration
const STORJ_CONFIG = {
    accessKeyId: import.meta.env.VITE_STORJ_ACCESS_KEY,
    secretAccessKey: import.meta.env.VITE_STORJ_SECRET_KEY,
    endpoint: import.meta.env.VITE_STORJ_ENDPOINT || 'https://gateway.storjshare.io',
    bucket: import.meta.env.VITE_STORJ_BUCKET || 'arshita-diary',
    region: import.meta.env.VITE_STORJ_REGION || 'us-east-1',
};

// Create S3 client configured for Storj
export const s3Client = new S3Client({
    endpoint: STORJ_CONFIG.endpoint,
    region: STORJ_CONFIG.region,
    credentials: {
        accessKeyId: STORJ_CONFIG.accessKeyId,
        secretAccessKey: STORJ_CONFIG.secretAccessKey,
    },
    forcePathStyle: true,
});

export const BUCKET_NAME = STORJ_CONFIG.bucket;

// ========================================
// FILE OPERATIONS (Photos & Audio)
// ========================================

/**
 * Upload a file to Storj and get a presigned URL for reading
 */
export async function uploadFile(key, file, contentType) {
    const arrayBuffer = await file.arrayBuffer();

    const putCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: new Uint8Array(arrayBuffer),
        ContentType: contentType,
        CacheControl: 'no-cache, no-store, must-revalidate',
    });

    await s3Client.send(putCommand);

    // Generate a presigned URL that lasts 7 days
    const getCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });

    const presignedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 604800 }); // 7 days
    return presignedUrl;
}

/**
 * Upload a photo
 */
export async function uploadPhoto(dateStr, file) {
    const key = `photos/${dateStr}/${Date.now()}.jpg`;
    return uploadFile(key, file, 'image/jpeg');
}

/**
 * Upload audio recording
 */
export async function uploadAudio(dateStr, blob) {
    const key = `audio/${dateStr}-morning.webm`;
    return uploadFile(key, blob, 'audio/webm');
}

/**
 * Refresh a presigned URL for a file
 */
export async function getPresignedUrl(key) {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ResponseCacheControl: 'no-cache, no-store, must-revalidate',
    });
    return getSignedUrl(s3Client, command, { expiresIn: 604800 });
}

// ========================================
// DATA OPERATIONS (Journal entries as JSON)
// ========================================

const ENTRIES_KEY = 'data/entries.json';

/**
 * Save all entries to Storj
 */
export async function saveEntries(entries, bucketName = BUCKET_NAME) {
    const json = JSON.stringify(entries, null, 2);

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: ENTRIES_KEY,
        Body: json,
        ContentType: 'application/json',
        CacheControl: 'no-cache, no-store, must-revalidate',
    });

    await s3Client.send(command);
}

/**
 * Load all entries from Storj
 */
export async function loadEntries(bucketName = BUCKET_NAME) {
    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: ENTRIES_KEY,
            ResponseCacheControl: 'no-cache, no-store, must-revalidate',
        });

        const response = await s3Client.send(command);
        const bodyString = await response.Body.transformToString();
        return JSON.parse(bodyString);
    } catch (error) {
        if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
            return {};
        }
        console.error('Error loading entries:', error);
        return {};
    }
}

/**
 * Mutex lock for saveEntry to prevent race conditions.
 * All saves queue behind this promise.
 */
let saveLock = Promise.resolve();

/**
 * Save a single entry (with mutex to prevent race conditions)
 * Critical: Each save waits for the previous to complete,
 * ensuring we always load the latest data before merging.
 */
export async function saveEntry(dateStr, entryData, bucketName = BUCKET_NAME) {
    // Chain this save operation behind any pending saves
    const saveOperation = saveLock.then(async () => {
        const entries = await loadEntries(bucketName);
        entries[dateStr] = {
            ...entries[dateStr],
            ...entryData,
            updatedAt: new Date().toISOString(),
        };
        await saveEntries(entries, bucketName);
        return entries;
    }).catch(error => {
        console.error('Error in saveEntry:', error);
        throw error;
    });

    // Update the lock to point to this operation
    saveLock = saveOperation.catch(() => { }); // Prevent unhandled rejection if this fails

    return saveOperation;
}

/**
 * Get a single entry
 */
export async function getEntry(dateStr) {
    const entries = await loadEntries();
    return entries[dateStr] || null;
}



/**
 * Mass refresh all media URLs in entries
 */
export async function refreshAllMediaUrls(entries, bucketName = BUCKET_NAME) {
    console.log(`♻️ Refreshing media URLs for ${bucketName}...`);
    const refreshedEntries = { ...entries };
    let hasChanges = false;

    const refreshPromises = [];

    for (const [date, entry] of Object.entries(refreshedEntries)) {
        // 1. Refresh Photos
        if (entry.photos && Array.isArray(entry.photos)) {
            entry.photos.forEach((photo, idx) => {
                if (photo.key) {
                    refreshPromises.push(
                        getPresignedUrl(photo.key).then(url => {
                            if (photo.url !== url) {
                                photo.url = url;
                                hasChanges = true;
                            }
                        })
                    );
                }
            });
        }

        // 2. Refresh Audio
        if (entry.audioUrl) {
            // Determine key from URL if not stored
            // Audio keys are usually: audio/YYYY-MM-DD-morning.webm
            const audioKey = entry.audioKey || `audio/${date}-morning.webm`;
            refreshPromises.push(
                getPresignedUrl(audioKey).then(url => {
                    if (entry.audioUrl !== url) {
                        entry.audioUrl = url;
                        entry.audioKey = audioKey; // Ensure key is stored
                        hasChanges = true;
                    }
                }).catch(() => {
                    // If refresh fails, maybe the file doesn't exist
                    console.warn(`Could not refresh audio for ${date}`);
                })
            );
        }
    }

    await Promise.all(refreshPromises);
    return { refreshedEntries, hasChanges };
}

/**
 * Mutex lock for logs to prevent race conditions.
 */
let logLock = Promise.resolve();

const LOGS_KEY = 'logs/access_logs.json';

/**
 * Save a tracking log to Storj
 * Appends to a single log file
 */
export async function saveLog(logData, bucketName = BUCKET_NAME) {
    // Chain log operations
    const logOperation = logLock.then(async () => {
        let logs = [];

        // 1. Try to load existing logs
        try {
            const command = new GetObjectCommand({
                Bucket: bucketName,
                Key: LOGS_KEY,
                ResponseCacheControl: 'no-cache, no-store, must-revalidate',
            });
            const response = await s3Client.send(command);
            const str = await response.Body.transformToString();
            logs = JSON.parse(str);
            if (!Array.isArray(logs)) logs = [];
        } catch (e) {
            // File doesn't exist yet, start empty
            logs = [];
        }

        // 2. Append new log
        logs.push(logData);

        // 3. Save back
        const putCommand = new PutObjectCommand({
            Bucket: bucketName,
            Key: LOGS_KEY,
            Body: JSON.stringify(logs, null, 2),
            ContentType: 'application/json',
            CacheControl: 'no-cache, no-store, must-revalidate',
        });

        await s3Client.send(putCommand);
        return LOGS_KEY;
    }).catch(error => {
        console.error('Error saving log:', error);
        // Don't throw, just log error so app flow continues
    });

    logLock = logOperation;
    return logOperation;
}
// Load App Config (Password, etc.)
export const loadConfig = async (bucketName = STORJ_CONFIG.bucket) => {
    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: 'data/config.json',
            ResponseCacheControl: 'no-cache, no-store, must-revalidate',
        });
        const response = await s3Client.send(command);
        const str = await response.Body.transformToString();
        return JSON.parse(str);
    } catch (error) {
        if (error.name === 'NoSuchKey') {
            return null; // No config yet (first run)
        }
        console.error('Error loading config:', error);
        return null; // Fail safe
    }
};

// Save App Config
export const saveConfig = async (config, bucketName = STORJ_CONFIG.bucket) => {
    try {
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: 'data/config.json',
            Body: JSON.stringify(config),
            ContentType: 'application/json',
            CacheControl: 'no-cache, no-store, must-revalidate',
        });
        await s3Client.send(command);
        return true;
    } catch (error) {
        console.error('Error saving config:', error);
        throw error;
    }
};

/**
 * Sync all media (Photos & Audio) from Storj bucket to entries.json
 * Renamed from syncPhotosFromBucket for clarity
 */
export const syncAllMedia = async (bucketName = BUCKET_NAME) => {
    console.log(`🔍 Syncing media from bucket ${bucketName}...`);

    // 1. List all objects
    const bucketObjects = [];
    let continuationToken = undefined;

    do {
        const listCommand = new ListObjectsV2Command({
            Bucket: bucketName,
            ContinuationToken: continuationToken,
        });

        const response = await s3Client.send(listCommand);

        if (response.Contents) {
            for (const item of response.Contents) {
                bucketObjects.push(item);
            }
        }

        continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    // 2. Load current entries
    const entries = await loadEntries(bucketName);
    let hasChanges = false;

    // 3. Process Photos (Prefix: photos/)
    const photoObjects = bucketObjects.filter(o => o.Key.startsWith('photos/'));
    for (const item of photoObjects) {
        const match = item.Key.match(/^photos\/(\d{4}-\d{2}-\d{2})\/(.+)$/);
        if (match) {
            const date = match[1];
            if (!entries[date]) entries[date] = {};
            if (!entries[date].photos) entries[date].photos = [];

            const existing = entries[date].photos.find(p => p.key === item.Key);
            if (!existing) {
                console.log(`  ➕ Restoring photo ${item.Key}`);
                const url = await getPresignedUrl(item.Key);
                entries[date].photos.push({
                    url: url,
                    key: item.Key,
                    size: item.Size,
                    uploadedAt: item.LastModified?.toISOString() || new Date().toISOString(),
                    starred: false,
                });
                hasChanges = true;
            } else if (!existing.size) {
                existing.size = item.Size;
                hasChanges = true;
            }
        }
    }

    // 4. Process Audio (Prefix: audio/)
    const audioObjects = bucketObjects.filter(o => o.Key.startsWith('audio/'));
    for (const item of audioObjects) {
        // audio/YYYY-MM-DD-morning.webm
        const match = item.Key.match(/^audio\/(\d{4}-\d{2}-\d{2})-morning\.webm$/);
        if (match) {
            const date = match[1];
            if (!entries[date]) entries[date] = {};

            if (!entries[date].audioUrl || entries[date].audioKey !== item.Key) {
                console.log(`  ➕ Restoring audio ${item.Key}`);
                const url = await getPresignedUrl(item.Key);
                entries[date].audioUrl = url;
                entries[date].audioKey = item.Key;
                hasChanges = true;
            }
        }
    }

    // 5. Save if changes made
    if (hasChanges) {
        await saveEntries(entries, bucketName);
    }

    console.log(`✅ Sync complete for ${bucketName}. Changes: ${hasChanges}`);
    return entries;
};

export default {
    uploadPhoto,
    uploadAudio,
    loadEntries,
    saveEntries,
    saveEntry,
    getEntry,
    getPresignedUrl,
    saveLog,
    refreshAllMediaUrls,
    syncAllMedia,
};
