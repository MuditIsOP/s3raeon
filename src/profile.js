import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BUCKET_NAME = 'arshita-diary';
const ENDPOINT = 'https://gateway.storjshare.io';

const s3Client = new S3Client({
    endpoint: ENDPOINT,
    region: 'us-east-1',
    credentials: {
        accessKeyId: 'jvpikdtk2ueqylglupmzlpg6mvqa',
        secretAccessKey: 'jz6zn4h5tw22342g5taa6j7w4ugkrfacuikfrkf7wbv5jxywtuxmi',
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
