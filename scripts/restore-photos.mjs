/**
 * Photo Restoration Script
 * 
 * This script scans the Storj bucket for all photos,
 * gets their file sizes, and ensures they're in entries.json.
 * 
 * Run with: node --experimental-vm-modules scripts/restore-photos.mjs
 * Or import and run the `restorePhotos` function.
 */

import { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Configuration (same as storj.js)
const STORJ_CONFIG = {
    accessKeyId: process.env.VITE_STORJ_ACCESS_KEY,
    secretAccessKey: process.env.VITE_STORJ_SECRET_KEY,
    endpoint: process.env.VITE_STORJ_ENDPOINT || 'https://gateway.storjshare.io',
    bucket: process.env.VITE_STORJ_BUCKET || 'arshita-diary',
    region: 'us-east-1',
};

const s3Client = new S3Client({
    endpoint: STORJ_CONFIG.endpoint,
    region: STORJ_CONFIG.region,
    credentials: {
        accessKeyId: STORJ_CONFIG.accessKeyId,
        secretAccessKey: STORJ_CONFIG.secretAccessKey,
    },
    forcePathStyle: true,
});

const BUCKET_NAME = STORJ_CONFIG.bucket;
const ENTRIES_KEY = 'data/entries.json';

/**
 * Load current entries.json from Storj
 */
async function loadEntries() {
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
        throw error;
    }
}

/**
 * Save entries.json to Storj
 */
async function saveEntries(entries) {
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: ENTRIES_KEY,
        Body: JSON.stringify(entries, null, 2),
        ContentType: 'application/json',
        CacheControl: 'no-cache, no-store, must-revalidate',
    });
    await s3Client.send(command);
}

/**
 * List all photos in the bucket
 */
async function listAllPhotos() {
    const photos = [];
    let continuationToken = undefined;

    do {
        const command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: 'photos/',
            ContinuationToken: continuationToken,
        });

        const response = await s3Client.send(command);

        if (response.Contents) {
            for (const item of response.Contents) {
                // Key format: photos/YYYY-MM-DD/timestamp.jpg
                const match = item.Key.match(/^photos\/(\d{4}-\d{2}-\d{2})\/(.+)$/);
                if (match) {
                    photos.push({
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

    return photos;
}

/**
 * Get file size using HEAD request
 */
async function getFileSize(key) {
    try {
        const command = new HeadObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });
        const response = await s3Client.send(command);
        return response.ContentLength;
    } catch (error) {
        console.error(`Failed to get size for ${key}:`, error.message);
        return 0;
    }
}

/**
 * Generate a presigned URL for a photo
 */
async function getPresignedUrl(key) {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });
    return getSignedUrl(s3Client, command, { expiresIn: 604800 }); // 7 days
}

/**
 * Main restoration function
 */
export async function restorePhotos() {
    console.log('🔍 Scanning Storj bucket for photos...');

    // 1. Load current entries
    const entries = await loadEntries();
    console.log(`📖 Loaded entries.json with ${Object.keys(entries).length} dates`);

    // 2. List all photos in bucket
    const bucketPhotos = await listAllPhotos();
    console.log(`📸 Found ${bucketPhotos.length} photos in bucket`);

    // 3. Group photos by date
    const photosByDate = {};
    for (const photo of bucketPhotos) {
        if (!photosByDate[photo.date]) {
            photosByDate[photo.date] = [];
        }
        photosByDate[photo.date].push(photo);
    }

    // 4. Restore missing photos to entries
    let restoredCount = 0;
    let updatedCount = 0;

    for (const [date, datePhotos] of Object.entries(photosByDate)) {
        if (!entries[date]) {
            entries[date] = {};
        }

        const existingPhotos = entries[date].photos || [];
        const existingKeys = new Set(existingPhotos.map(p => {
            // Extract key from URL if possible
            const match = p.url?.match(/photos\/[^?]+/);
            return match ? match[0] : null;
        }).filter(Boolean));

        for (const photo of datePhotos) {
            if (!existingKeys.has(photo.key)) {
                // This photo is in bucket but not in entries - restore it!
                console.log(`  ➕ Restoring ${photo.key} (${(photo.size / 1024).toFixed(1)} KB)`);

                const url = await getPresignedUrl(photo.key);

                existingPhotos.push({
                    url: url,
                    key: photo.key,
                    size: photo.size,
                    uploadedAt: photo.lastModified?.toISOString() || new Date().toISOString(),
                    starred: false,
                });
                restoredCount++;
            } else {
                // Photo exists, but let's update size if missing
                const existingPhoto = existingPhotos.find(p => p.url?.includes(photo.key) || p.key === photo.key);
                if (existingPhoto && !existingPhoto.size) {
                    existingPhoto.size = photo.size;
                    existingPhoto.key = photo.key; // Ensure key is set
                    updatedCount++;
                }
            }
        }

        entries[date].photos = existingPhotos;
    }

    console.log(`\n✅ Restored ${restoredCount} missing photos`);
    console.log(`📏 Updated sizes for ${updatedCount} existing photos`);

    // 5. Save updated entries
    if (restoredCount > 0 || updatedCount > 0) {
        console.log('💾 Saving updated entries.json...');
        await saveEntries(entries);
        console.log('✅ Done!');
    } else {
        console.log('ℹ️ No changes needed - all photos already in entries.json');
    }

    return {
        restoredCount,
        updatedCount,
        totalPhotosInBucket: bucketPhotos.length,
    };
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
    restorePhotos()
        .then(result => {
            console.log('\n📊 Summary:', result);
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Error:', error);
            process.exit(1);
        });
}
