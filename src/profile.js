import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Use same config as storj.js - env vars have the working credentials
const STORJ_CONFIG = {
    accessKeyId: import.meta.env.VITE_STORJ_ACCESS_KEY,
    secretAccessKey: import.meta.env.VITE_STORJ_SECRET_KEY,
    endpoint: import.meta.env.VITE_STORJ_ENDPOINT || 'https://gateway.storjshare.io',
    bucket: import.meta.env.VITE_STORJ_BUCKET || 'arshita-diary',
    region: 'us-east-1',
};

const BUCKET_NAME = STORJ_CONFIG.bucket;

const s3Client = new S3Client({
    endpoint: STORJ_CONFIG.endpoint,
    region: STORJ_CONFIG.region,
    credentials: {
        accessKeyId: STORJ_CONFIG.accessKeyId,
        secretAccessKey: STORJ_CONFIG.secretAccessKey,
    },
    forcePathStyle: true,
});

// Default profile
const DEFAULT_PROFILE = {
    firstName: 'Arshita',
    lastName: '',
    email: '',
    mobile: '',
    dob: '',
    profilePhotoUrl: null,
};

// Load profile from Storj (no caching)
export const loadProfile = async () => {
    try {
        const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: 'profile/profile.json' });
        const response = await s3Client.send(command);
        const body = await response.Body.transformToString();
        const profile = JSON.parse(body);
        return profile;
    } catch (error) {
        if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
            return DEFAULT_PROFILE;
        }
        console.error('Error loading profile:', error);
        return DEFAULT_PROFILE;
    }
};

// Save profile to Storj (no caching)
export const saveProfile = async (profileData) => {
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: 'profile/profile.json',
        Body: JSON.stringify(profileData, null, 2),
        ContentType: 'application/json',
    });
    await s3Client.send(command);
    return profileData;
};

// Upload profile photo
export const uploadProfilePhoto = async (file) => {
    const ext = file.type.split('/')[1] || 'jpg';
    const key = `profile/photo.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const putCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: new Uint8Array(arrayBuffer),
        ContentType: file.type,
    });
    await s3Client.send(putCommand);

    // Get presigned URL for viewing (7 days)
    const getCommand = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
    const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 60 * 60 * 24 * 7 });
    return url;
};

// Get first letter for avatar
export const getInitials = (firstName) => {
    if (!firstName) return 'A';
    return firstName.charAt(0).toUpperCase();
};
