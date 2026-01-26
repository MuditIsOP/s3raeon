/**
 * COMPREHENSIVE ENTRIES REBUILD SCRIPT
 * 
 * This script:
 * 1. Scans the bucket for ALL actual files (source of truth)
 * 2. Loads existing entries.json to preserve starred status
 * 3. Rebuilds entries from scratch using ONLY what exists in the bucket
 * 4. Matches favorites by KEY (filename) since URLs change but keys don't
 * 5. Removes any entries that don't have corresponding files
 */

import { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
dotenv.config();

const BUCKET = process.env.VITE_STORJ_BUCKET;
const client = new S3Client({
    endpoint: process.env.VITE_STORJ_ENDPOINT,
    region: process.env.VITE_STORJ_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.VITE_STORJ_ACCESS_KEY,
        secretAccessKey: process.env.VITE_STORJ_SECRET_KEY,
    },
    forcePathStyle: true,
});

async function rebuildEntries() {
    console.log(`🔧 REBUILDING entries.json for bucket: ${BUCKET}\n`);

    // ========================================
    // STEP 1: Scan bucket for all actual files
    // ========================================
    console.log("📦 Step 1: Scanning bucket...");
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

    // Filter to only photos and audio (exclude placeholders, data files, etc.)
    const photoFiles = bucketObjects.filter(o =>
        o.Key.startsWith('photos/') &&
        !o.Key.endsWith('.file_placeholder') &&
        !o.Key.endsWith('/') &&
        o.Size > 0 // Must have content
    );
    const audioFiles = bucketObjects.filter(o =>
        o.Key.startsWith('audio/') &&
        o.Key.endsWith('.webm') &&
        o.Size > 0
    );

    console.log(`   Found ${photoFiles.length} photos and ${audioFiles.length} audio files in bucket.`);

    // ========================================
    // STEP 2: Load existing entries to get starred status
    // ========================================
    console.log("\n📂 Step 2: Loading existing entries to preserve starred status...");
    let oldEntries = {};
    try {
        const getCmd = new GetObjectCommand({ Bucket: BUCKET, Key: 'data/entries.json' });
        const res = await client.send(getCmd);
        const str = await res.Body.transformToString();
        oldEntries = JSON.parse(str);
    } catch (e) {
        console.log("   No existing entries.json found, starting fresh.");
    }

    // Build a map of starred photos by KEY (filename)
    const starredKeys = new Set();
    for (const [date, entry] of Object.entries(oldEntries)) {
        if (entry.photos && Array.isArray(entry.photos)) {
            for (const photo of entry.photos) {
                if (photo.starred && photo.key) {
                    starredKeys.add(photo.key);
                }
            }
        }
    }
    console.log(`   Found ${starredKeys.size} starred photos to preserve.`);

    // Also preserve other entry data (journal, mood, affirmation, etc.)
    const preservedData = {};
    for (const [date, entry] of Object.entries(oldEntries)) {
        preservedData[date] = {
            journal: entry.journal,
            mood: entry.mood,
            prompt: entry.prompt,
            affirmation: entry.affirmation,
            completed: entry.completed,
            morningCompleted: entry.morningCompleted,
            eveningCompleted: entry.eveningCompleted,
            updatedAt: entry.updatedAt,
        };
    }

    // ========================================
    // STEP 3: Rebuild entries from bucket
    // ========================================
    console.log("\n🔨 Step 3: Rebuilding entries from bucket...");
    const newEntries = {};

    // Process Photos
    console.log("   Processing photos...");
    for (const item of photoFiles) {
        // More lenient regex - capture date and any filename
        const match = item.Key.match(/^photos\/(\d{4}-\d{2}-\d{2})\/(.+)$/);
        if (match) {
            const date = match[1];

            // Initialize entry if needed
            if (!newEntries[date]) {
                newEntries[date] = { photos: [] };
            }
            if (!newEntries[date].photos) {
                newEntries[date].photos = [];
            }

            // Generate fresh signed URL
            try {
                const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: item.Key });
                const url = await getSignedUrl(client, cmd, { expiresIn: 604800 }); // 7 days

                // Preserve starred status by matching KEY
                const isStarred = starredKeys.has(item.Key);

                newEntries[date].photos.push({
                    key: item.Key,
                    url: url,
                    size: item.Size,
                    uploadedAt: item.LastModified?.toISOString() || new Date().toISOString(),
                    starred: isStarred,
                });

                process.stdout.write(isStarred ? '★' : '.');
            } catch (err) {
                console.error(`\n   ❌ Failed to sign ${item.Key}:`, err.message);
            }
        }
    }

    // Process Audio
    console.log("\n   Processing audio...");
    for (const item of audioFiles) {
        const match = item.Key.match(/^audio\/(\d{4}-\d{2}-\d{2})-morning\.webm$/);
        if (match) {
            const date = match[1];

            if (!newEntries[date]) {
                newEntries[date] = {};
            }

            try {
                const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: item.Key });
                const url = await getSignedUrl(client, cmd, { expiresIn: 604800 });

                newEntries[date].audioUrl = url;
                newEntries[date].audioKey = item.Key;
                process.stdout.write('♫');
            } catch (err) {
                console.error(`\n   ❌ Failed to sign ${item.Key}:`, err.message);
            }
        }
    }

    // ========================================
    // STEP 4: Merge preserved data (journal, mood, etc.)
    // ========================================
    console.log("\n\n📝 Step 4: Merging preserved data (journal, mood, etc.)...");
    for (const [date, data] of Object.entries(preservedData)) {
        if (!newEntries[date]) {
            // Only create entry if there's meaningful data to preserve
            if (data.journal || data.mood || data.affirmation) {
                newEntries[date] = {};
            } else {
                continue; // Skip empty entries
            }
        }

        // Merge preserved fields
        if (data.journal) newEntries[date].journal = data.journal;
        if (data.mood) newEntries[date].mood = data.mood;
        if (data.prompt) newEntries[date].prompt = data.prompt;
        if (data.affirmation) newEntries[date].affirmation = data.affirmation;
        if (data.completed !== undefined) newEntries[date].completed = data.completed;
        if (data.morningCompleted !== undefined) newEntries[date].morningCompleted = data.morningCompleted;
        if (data.eveningCompleted !== undefined) newEntries[date].eveningCompleted = data.eveningCompleted;
        if (data.updatedAt) newEntries[date].updatedAt = data.updatedAt;
    }

    // ========================================
    // STEP 5: Save rebuilt entries
    // ========================================
    const totalPhotos = Object.values(newEntries).reduce((sum, e) => sum + (e.photos?.length || 0), 0);
    const totalAudio = Object.values(newEntries).filter(e => e.audioUrl).length;
    const totalStarred = Object.values(newEntries).reduce((sum, e) => sum + (e.photos?.filter(p => p.starred).length || 0), 0);

    console.log(`\n💾 Step 5: Saving rebuilt entries...`);
    console.log(`   📸 Photos: ${totalPhotos}`);
    console.log(`   🎙️  Audio: ${totalAudio}`);
    console.log(`   ⭐ Starred: ${totalStarred}`);
    console.log(`   📅 Total dates with data: ${Object.keys(newEntries).length}`);

    const putCmd = new PutObjectCommand({
        Bucket: BUCKET,
        Key: 'data/entries.json',
        Body: JSON.stringify(newEntries, null, 2),
        ContentType: 'application/json',
        CacheControl: 'no-cache, no-store, must-revalidate'
    });
    await client.send(putCmd);

    console.log("\n✅ REBUILD COMPLETE!");
}

rebuildEntries();
