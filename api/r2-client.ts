import { S3Client } from '@aws-sdk/client-s3';

export const accountId = process.env.R2_ACCOUNT_ID || 'bd0c90c36c628664f396ac294fa0e863';
export const accessKeyId = process.env.R2_ACCESS_KEY_ID || 'bd3036bba21c44bb0a777a530a045598';
export const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
export const bucketName = process.env.R2_BUCKET_NAME || 'amphstudio';
export const publicDomain = (process.env.R2_PUBLIC_DOMAIN || `https://pub-${accountId}.r2.dev`).replace(/\/$/, '');

export function getR2Client() {
  const currentAccessKeyId = process.env.R2_ACCESS_KEY_ID || accessKeyId;
  const currentSecretKey = process.env.R2_SECRET_ACCESS_KEY || secretAccessKey;
  const currentAccountId = process.env.R2_ACCOUNT_ID || accountId;

  return new S3Client({
    region: 'auto',
    endpoint: `https://${currentAccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: currentAccessKeyId,
      secretAccessKey: currentSecretKey,
    },
  });
}
