import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
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

async function listBucket() {
    console.log(`📦 Listing ALL objects in bucket: ${BUCKET}\n`);

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

    // Count by category
    const photos = bucketObjects.filter(o => o.Key.startsWith('photos/'));
    const audio = bucketObjects.filter(o => o.Key.startsWith('audio/'));
    const data = bucketObjects.filter(o => o.Key.startsWith('data/'));
    const logs = bucketObjects.filter(o => o.Key.startsWith('logs/'));
    const other = bucketObjects.filter(o => !o.Key.startsWith('photos/') && !o.Key.startsWith('audio/') && !o.Key.startsWith('data/') && !o.Key.startsWith('logs/'));

    console.log(`Total objects: ${bucketObjects.length}`);
    console.log(`  📸 Photos: ${photos.length}`);
    console.log(`  🎙️  Audio: ${audio.length}`);
    console.log(`  📁 Data: ${data.length}`);
    console.log(`  📝 Logs: ${logs.length}`);
    console.log(`  ❓ Other: ${other.length}`);

    console.log(`\n--- ALL OBJECTS ---`);
    bucketObjects.forEach((o, i) => console.log(`${i + 1}. ${o.Key} (${o.Size} bytes)`));
}

listBucket();
