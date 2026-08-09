import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const accountId = process.env.R2_ACCOUNT_ID || '';
const accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
const bucketName = process.env.R2_BUCKET_NAME || 'amphstudio';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

async function main() {
  console.log('Testing R2 connection...');
  try {
    const listRes = await s3.send(new ListObjectsV2Command({ Bucket: bucketName }));
    console.log('Bucket contents count:', listRes.Contents?.length || 0);

    const testKey = `test-upload-${Date.now()}.txt`;
    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: testKey,
      Body: Buffer.from('Cloudflare R2 Test OK'),
      ContentType: 'text/plain',
    }));
    console.log('Uploaded test object:', testKey);
  } catch (err) {
    console.error('R2 Error:', err);
  }
}

main();
