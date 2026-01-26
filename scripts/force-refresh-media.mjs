import { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
dotenv.config();

const BUCKET = process.env.VITE_STORJ_BUCKET;
const CLIENT_CONFIG = {
    endpoint: process.env.VITE_STORJ_ENDPOINT,
    region: process.env.VITE_STORJ_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.VITE_STORJ_ACCESS_KEY,
        secretAccessKey: process.env.VITE_STORJ_SECRET_KEY,
    },
    forcePathStyle: true,
};

const client = new S3Client(CLIENT_CONFIG);

async function forceRefresh() {
    console.log(`🧨 Force Refreshing ALL media in ${BUCKET} by scanning bucket...`);

    // 1. List ALL objects in bucket
    const bucketObjects = [];
    let continuationToken = undefined;

    do {
        const listCommand = new ListObjectsV2Command({
            Bucket: BUCKET,
            ContinuationToken: continuationToken,
        });
        const response = await client.send(listCommand);
        if (response.Contents) {
            for (const item of response.Contents) {
                bucketObjects.push(item);
            }
        }
        continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    console.log(`📦 Found ${bucketObjects.length} total objects in bucket.`);

    // DEBUG: Print all photo objects
    const allPhotoObjects = bucketObjects.filter(o => o.Key.startsWith('photos/'));
    console.log(`\n📸 ALL photo objects (${allPhotoObjects.length}):`);
    allPhotoObjects.forEach(o => console.log(`   ${o.Key}`));

    // 2. Load existing entries (to preserve starred, etc.)
    let entries = {};
    try {
        const getCmd = new GetObjectCommand({ Bucket: BUCKET, Key: 'data/entries.json' });
        const res = await client.send(getCmd);
        const str = await res.Body.transformToString();
        entries = JSON.parse(str);
    } catch (e) {
        console.log("No existing entries.json, starting fresh.");
        entries = {};
    }

    let photoCount = 0;
    let audioCount = 0;

    // 3. Process Photos - NO EXTENSION FILTER, just skip placeholders
    const photoObjects = bucketObjects.filter(o =>
        o.Key.startsWith('photos/') &&
        !o.Key.endsWith('.file_placeholder') &&
        !o.Key.endsWith('/') // Skip folder markers
    );
    console.log(`\n📸 Processing ${photoObjects.length} photo objects...`);

    for (const item of photoObjects) {
        // More lenient regex - just get date folder
        const match = item.Key.match(/^photos\/(\d{4}-\d{2}-\d{2})\/(.+)$/);
        if (match) {
            const date = match[1];
            if (!entries[date]) entries[date] = {};
            if (!entries[date].photos) entries[date].photos = [];

            // Find existing or create new
            let existing = entries[date].photos.find(p => p.key === item.Key);
            if (!existing) {
                existing = { key: item.Key, starred: false };
                entries[date].photos.push(existing);
            }

            // Generate fresh URL
            try {
                const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: item.Key });
                const url = await getSignedUrl(client, cmd, { expiresIn: 604800 });
                existing.url = url;
                existing.size = item.Size;
                existing.uploadedAt = existing.uploadedAt || item.LastModified?.toISOString() || new Date().toISOString();
                process.stdout.write('.');
                photoCount++;
            } catch (err) {
                console.error(`\nFailed to sign ${item.Key}:`, err.message);
            }
        } else {
            console.log(`\n⚠️ Skipped non-matching key: ${item.Key}`);
        }
    }

    // 4. Process Audio
    const audioObjects = bucketObjects.filter(o => o.Key.startsWith('audio/') && o.Key.endsWith('.webm'));
    console.log(`\n🎙️  Processing ${audioObjects.length} audio files...`);

    for (const item of audioObjects) {
        const match = item.Key.match(/^audio\/([\d-]+)-morning\.webm$/);
        if (match) {
            const date = match[1];
            if (!entries[date]) entries[date] = {};

            try {
                const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: item.Key });
                const url = await getSignedUrl(client, cmd, { expiresIn: 604800 });
                entries[date].audioUrl = url;
                entries[date].audioKey = item.Key;
                process.stdout.write('♫');
                audioCount++;
            } catch (err) {
                console.error(`\nFailed to sign audio ${item.Key}:`, err.message);
            }
        }
    }

    // 5. Save
    console.log(`\n💾 Saving ${photoCount} photos + ${audioCount} audio to ${BUCKET}...`);
    const putCmd = new PutObjectCommand({
        Bucket: BUCKET,
        Key: 'data/entries.json',
        Body: JSON.stringify(entries, null, 2),
        ContentType: 'application/json',
        CacheControl: 'no-cache, no-store, must-revalidate'
    });
    await client.send(putCmd);
    console.log("✅ DONE.");
}

forceRefresh();
