import { del } from '@vercel/blob';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, bucketName } from './r2-client';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (url.includes('public.blob.vercel-storage.com')) {
      await del(url);
    } else {
      try {
        const urlObj = new URL(url);
        const key = urlObj.pathname.replace(/^\//, '');
        if (key) {
          const r2 = getR2Client();
          await r2.send(new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME || bucketName,
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
    return res.status(500).json({ error: error.message });
  }
}
