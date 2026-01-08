import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
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
        const command = new GetObjectCommand({
            Bucket: 'mudit-diary',
            Key: 'data/entries.json',
        });
        const response = await client.send(command);
        const str = await response.Body.transformToString();
        console.log("Current Entry Count:", Object.keys(JSON.parse(str)).length);
        console.log("Entries:", str);
    } catch (e) {
        console.error("Error reading bucket:", e);
    }
}

checkEntries();
