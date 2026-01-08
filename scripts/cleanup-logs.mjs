import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
dotenv.config();

const BUCKET = 'mudit-diary';

const client = new S3Client({
    endpoint: process.env.VITE_STORJ_ENDPOINT,
    region: process.env.VITE_STORJ_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.VITE_STORJ_ACCESS_KEY,
        secretAccessKey: process.env.VITE_STORJ_SECRET_KEY,
    },
    forcePathStyle: true,
});

// Debug env
if (!process.env.VITE_STORJ_ENDPOINT) console.error("❌ VITE_STORJ_ENDPOINT missing");
if (!process.env.VITE_STORJ_ACCESS_KEY) console.error("❌ VITE_STORJ_ACCESS_KEY missing");

async function cleanup() {
    console.log('🧹 Cleaning up logs in ' + BUCKET + ' ... (Endpoint: ' + process.env.VITE_STORJ_ENDPOINT + ')');

    let continuationToken = undefined;
    const toDelete = [];

    // 1. Find files
    try {
        do {
            const command = new ListObjectsV2Command({
                Bucket: BUCKET,
                Prefix: 'logs/',
                ContinuationToken: continuationToken,
            });

            const response = await client.send(command);

            if (response.Contents) {
                for (const item of response.Contents) {
                    // Keep the consolidated file, delete everything else (session_*.json)
                    if (item.Key !== 'logs/access_logs.json') {
                        toDelete.push({ Key: item.Key });
                    }
                }
            }

            continuationToken = response.NextContinuationToken;
        } while (continuationToken);
    } catch (err) {
        console.error("❌ Error listing objects:", err);
        return;
    }

    if (toDelete.length === 0) {
        console.log('✨ No old logs found. Clean!');
        return;
    }

    console.log(`🗑️  Found ${toDelete.length} old log files to delete...`);

    // 2. Delete batches
    // S3 DeleteObjects limit is 1000
    for (let i = 0; i < toDelete.length; i += 1000) {
        const batch = toDelete.slice(i, i + 1000);
        const command = new DeleteObjectsCommand({
            Bucket: BUCKET,
            Delete: {
                Objects: batch,
                Quiet: false, // Return list of deleted objects
            },
        });

        const result = await client.send(command);
        console.log(`   Deleted ${result.Deleted?.length || 0} files (Batch ${Math.floor(i / 1000) + 1})`);

        if (result.Errors?.length > 0) {
            console.error('Errors:', result.Errors);
        }
    }

    console.log('✅ Done! Only access_logs.json remains.');
}

cleanup();
