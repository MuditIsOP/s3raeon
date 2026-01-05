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
export async function saveEntries(entries) {
    const json = JSON.stringify(entries, null, 2);

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
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
export async function loadEntries() {
    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
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
export async function saveEntry(dateStr, entryData) {
    // Chain this save operation behind any pending saves
    const saveOperation = saveLock.then(async () => {
        const entries = await loadEntries();
        entries[dateStr] = {
            ...entries[dateStr],
            ...entryData,
            updatedAt: new Date().toISOString(),
        };
        await saveEntries(entries);
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

export default {
    uploadPhoto,
    uploadAudio,
    loadEntries,
    saveEntries,
    saveEntry,
    getEntry,
    getPresignedUrl,
};
// Load App Config (Password, etc.)
export const loadConfig = async () => {
    try {
        const command = new GetObjectCommand({
            Bucket: STORJ_CONFIG.bucket,
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
export const saveConfig = async (config) => {
    try {
        const command = new PutObjectCommand({
            Bucket: STORJ_CONFIG.bucket,
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
 * Sync photos from Storj bucket to entries.json
 * Scans the bucket, finds missing photos, restores them with file sizes
 */
export const syncPhotosFromBucket = async () => {
    console.log('🔍 Syncing photos from bucket...');

    // 1. List all photos in bucket
    const bucketPhotos = [];
    let continuationToken = undefined;

    do {
        const listCommand = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: 'photos/',
            ContinuationToken: continuationToken,
        });

        const response = await s3Client.send(listCommand);

        if (response.Contents) {
            for (const item of response.Contents) {
                // Key format: photos/YYYY-MM-DD/timestamp.jpg
                const match = item.Key.match(/^photos\/(\d{4}-\d{2}-\d{2})\/(.+)$/);
                if (match) {
                    bucketPhotos.push({
                        key: item.Key,
                        date: match[1],
                        filename: match[2],
                        size: item.Size,
                        lastModified: item.LastModified,
                    });
                }
            }
        }

        continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    console.log(`📸 Found ${bucketPhotos.length} photos in bucket`);

    // 2. Load current entries
    const entries = await loadEntries();

    // 3. Group photos by date
    const photosByDate = {};
    for (const photo of bucketPhotos) {
        if (!photosByDate[photo.date]) {
            photosByDate[photo.date] = [];
        }
        photosByDate[photo.date].push(photo);
    }

    // 4. Restore missing photos
    let restoredCount = 0;
    let updatedCount = 0;

    for (const [date, datePhotos] of Object.entries(photosByDate)) {
        if (!entries[date]) {
            entries[date] = {};
        }

        const existingPhotos = entries[date].photos || [];
        const existingKeys = new Set(existingPhotos.map(p => p.key).filter(Boolean));

        for (const photo of datePhotos) {
            const existingPhoto = existingPhotos.find(p => p.key === photo.key);

            if (!existingPhoto && !existingKeys.has(photo.key)) {
                // Photo in bucket but not in entries - restore it!
                console.log(`  ➕ Restoring ${photo.key}`);

                const url = await getPresignedUrl(photo.key);

                existingPhotos.push({
                    url: url,
                    key: photo.key,
                    size: photo.size,
                    uploadedAt: photo.lastModified?.toISOString() || new Date().toISOString(),
                    starred: false,
                });
                restoredCount++;
            } else if (existingPhoto && !existingPhoto.size) {
                // Update size if missing
                existingPhoto.size = photo.size;
                updatedCount++;
            }
        }

        entries[date].photos = existingPhotos;
    }

    // 5. Save if changes made
    if (restoredCount > 0 || updatedCount > 0) {
        await saveEntries(entries);
    }

    console.log(`✅ Restored ${restoredCount}, updated sizes for ${updatedCount}`);

    return {
        restoredCount,
        updatedCount,
        totalPhotosInBucket: bucketPhotos.length,
        entries, // Return updated entries for UI refresh
    };
};
