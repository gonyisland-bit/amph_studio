import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from '@aws-sdk/client-s3';

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
  console.log('Configuring CORS for Cloudflare R2 bucket:', bucketName);
  try {
    await r2.send(new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
            AllowedOrigins: ['*'],
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }));
    console.log('Successfully set CORS rules on R2 bucket!');

    const res = await r2.send(new GetBucketCorsCommand({ Bucket: bucketName }));
    console.log('Current Bucket CORS Rules:', JSON.stringify(res.CORSRules, null, 2));
  } catch (err) {
    console.error('Error setting CORS on R2 bucket:', err);
  }
}

main();
