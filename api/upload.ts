import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const defaultAccountId = 'bd0c90c36c628664f396ac294fa0e863';
const defaultAccessKeyId = 'bd3036bba21c44bb0a777a530a045598';
const defaultSecretAccessKey = 'f95e72f45df1014a6da96dbbb8cdc2e21c1f91532aef789aa079d94d0e2be76a';
const defaultBucketName = 'amphstudio';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const accountId = process.env.R2_ACCOUNT_ID || defaultAccountId;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID || defaultAccessKeyId;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || defaultSecretAccessKey;
    const bucketName = process.env.R2_BUCKET_NAME || defaultBucketName;
    const publicDomain = (process.env.R2_PUBLIC_DOMAIN || `https://pub-${accountId}.r2.dev`).replace(/\/$/, '');

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const filename = body.filename || `file-${Date.now()}`;
    const contentType = body.contentType || 'application/octet-stream';

    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `uploads/${Date.now()}-${sanitizedFilename}`;

    const r2 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });
    const publicUrl = `${publicDomain}/${key}`;

    return res.status(200).json({
      uploadUrl,
      url: publicUrl,
      key,
    });
  } catch (error: any) {
    console.error('R2 upload error:', error);
    return res.status(500).json({ error: error?.message || 'Server error creating upload URL' });
  }
}
