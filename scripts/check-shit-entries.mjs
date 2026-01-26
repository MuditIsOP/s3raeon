import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
dotenv.config();

const client = new S3Client({
    endpoint: process.env.VITE_STORJ_ENDPOINT,
    region: process.env.VITE_STORJ_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.VITE_STORJ_ACCESS_KEY,
        secretAccessKey: process.env.VITE_STORJ_SECRET_KEY,
    },
    forcePathStyle: true,
});

async function checkEntries() {
    try {
        console.log("Checking bucket: mudit-diary/logs/ ...");
        const command = new ListObjectsV2Command({
            Bucket: 'mudit-diary',
            Prefix: 'logs/',
        });
        const response = await client.send(command);
        console.log("Log files found:", response.Contents?.length || 0);
        if (response.Contents?.length > 0) {
            console.log("First 5 files:", response.Contents.slice(0, 5).map(i => i.Key));
        }
    } catch (e) {
        console.error("Error listing logs:", e);
    }
}

checkEntries();
