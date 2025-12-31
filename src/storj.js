import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Storj S3-compatible configuration
const STORJ_CONFIG = {
    accessKeyId: 'jvpikdtk2ueqylglupmzlpg6mvqa',
    secretAccessKey: 'jz6zn4h5tw22342g5taa6j7w4ugkrfacuikfrkf7wbv5jxywtuxmi',
    endpoint: 'https://gateway.storjshare.io',
    bucket: 'arshita-diary',
    region: 'us-east-1',
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
 * Save a single entry
 */
export async function saveEntry(dateStr, entryData) {
    const entries = await loadEntries();
    entries[dateStr] = {
        ...entries[dateStr],
        ...entryData,
        updatedAt: new Date().toISOString(),
    };
    await saveEntries(entries);
    return entries;
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
