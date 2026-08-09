import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2Client, bucketName, publicDomain } from './r2-client';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const filename = body.filename || `file-${Date.now()}`;
    const contentType = body.contentType || 'application/octet-stream';

    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `uploads/${Date.now()}-${sanitizedFilename}`;

    const r2 = getR2Client();
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || bucketName,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });
    const domain = (process.env.R2_PUBLIC_DOMAIN || publicDomain).replace(/\/$/, '');
    const publicUrl = `${domain}/${key}`;

    return res.status(200).json({
      uploadUrl,
      url: publicUrl,
      key,
    });
  } catch (error: any) {
    console.error('R2 upload error:', error);
    return res.status(500).json({ error: error.message });
  }
}
