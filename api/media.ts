import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const defaultAccountId = 'bd0c90c36c628664f396ac294fa0e863';
const defaultAccessKeyId = 'bd3036bba21c44bb0a777a530a045598';
const defaultSecretAccessKey = 'f95e72f45df1014a6da96dbbb8cdc2e21c1f91532aef789aa079d94d0e2be76a';
const defaultBucketName = 'amphstudio';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,HEAD');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Range'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const key = req.query.key || (req.url ? req.url.split('?key=')[1] : '');
  if (!key) {
    return res.status(400).json({ error: 'Key parameter is required' });
  }

  try {
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

    const cleanKey = decodeURIComponent(key).replace(/^\//, '');
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: cleanKey,
      Range: req.headers.range,
    });

    const s3Object = await r2.send(command);

    if (s3Object.ContentType) {
      res.setHeader('Content-Type', s3Object.ContentType);
    }
    if (s3Object.ContentLength) {
      res.setHeader('Content-Length', s3Object.ContentLength);
    }
    if (s3Object.ContentRange) {
      res.setHeader('Content-Range', s3Object.ContentRange);
      res.status(206);
    } else {
      res.status(200);
    }

    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    // Convert S3 object stream to Node.js buffer or stream
    const byteArray = await s3Object.Body?.transformToByteArray();
    if (byteArray) {
      return res.send(Buffer.from(byteArray));
    }
    return res.end();
  } catch (error: any) {
    console.error('Error fetching media from R2:', error);
    return res.status(404).json({ error: 'Media object not found' });
  }
}
