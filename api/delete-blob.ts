import { del } from '@vercel/blob';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Only delete if it's a Vercel Blob URL
    if (url.includes('public.blob.vercel-storage.com')) {
      await del(url);
    }
    
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error deleting blob:', error);
    return res.status(500).json({ error: error.message });
  }
}
