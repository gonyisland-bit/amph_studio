import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const accountId = process.env.R2_ACCOUNT_ID || 'bd0c90c36c628664f396ac294fa0e863';
const accessKeyId = process.env.R2_ACCESS_KEY_ID || 'bd3036bba21c44bb0a777a530a045598';
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || 'f95e72f45df1014a6da96dbbb8cdc2e21c1f91532aef789aa079d94d0e2be76a';
const bucketName = process.env.R2_BUCKET_NAME || 'amphstudio';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

async function main() {
  console.log('Testing S3 GetObjectCommand on R2 bucket...');
  try {
    const key = 'test/live-test-1786251687164.png';
    const res = await r2.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    }));
    console.log('GetObject success! ContentType:', res.ContentType, 'ContentLength:', res.ContentLength);
  } catch (err) {
    console.error('GetObject error:', err);
  }
}

main();
