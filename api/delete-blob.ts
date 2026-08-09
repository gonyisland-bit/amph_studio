import { del } from '@vercel/blob';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

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
    const { url } = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (url.includes('public.blob.vercel-storage.com')) {
      await del(url);
    } else {
      try {
        let key = '';
        if (url.includes('?key=')) {
          key = decodeURIComponent(url.split('?key=')[1]);
        } else {
          const fullUrl = url.startsWith('http') ? url : `https://dummy.com${url.startsWith('/') ? '' : '/'}${url}`;
          const urlObj = new URL(fullUrl);
          key = decodeURIComponent(urlObj.pathname.replace(/^\//, ''));
        }
        if (key) {
          const accountId = process.env.R2_ACCOUNT_ID || defaultAccountId;
          const accessKeyId = process.env.R2_ACCESS_KEY_ID || defaultAccessKeyId;
          const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || defaultSecretAccessKey;
          const bucketName = process.env.R2_BUCKET_NAME || defaultBucketName;

          const r2 = new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
              accessKeyId,
              secretAccessKey,
            },
          });

          await r2.send(new DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
          }));
        }
      } catch (e) {
        console.warn('R2 delete parse warning:', e);
      }
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error deleting media:', error);
    return res.status(500).json({ error: error?.message || 'Error deleting file' });
  }
}
