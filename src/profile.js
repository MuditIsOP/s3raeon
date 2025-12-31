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

// Load profile from Storj
export const loadProfile = async () => {
    try {
        const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: 'profile/profile.json' });
        const response = await s3Client.send(command);
        const body = await response.Body.transformToString();
        const profile = JSON.parse(body);

        // Cache in localStorage for quick access
        localStorage.setItem('s3raeon_profile', JSON.stringify(profile));
        return profile;
    } catch (error) {
        if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
            // No profile exists, return default
            return DEFAULT_PROFILE;
        }
        // Try to get from localStorage cache
        const cached = localStorage.getItem('s3raeon_profile');
        if (cached) {
            try { return JSON.parse(cached); } catch { }
        }
        return DEFAULT_PROFILE;
    }
};

// Save profile to Storj
export const saveProfile = async (profileData) => {
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: 'profile/profile.json',
        Body: JSON.stringify(profileData, null, 2),
        ContentType: 'application/json',
    });
    await s3Client.send(command);

    // Update localStorage cache
    localStorage.setItem('s3raeon_profile', JSON.stringify(profileData));
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

// Get cached profile from localStorage (fast)
export const getCachedProfile = () => {
    const cached = localStorage.getItem('s3raeon_profile');
    if (cached) {
        try { return JSON.parse(cached); } catch { }
    }
    return DEFAULT_PROFILE;
};

// Get first letter for avatar
export const getInitials = (firstName) => {
    if (!firstName) return 'A';
    return firstName.charAt(0).toUpperCase();
};
